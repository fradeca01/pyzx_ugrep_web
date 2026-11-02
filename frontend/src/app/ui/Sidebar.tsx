"use client";

import { useState, useRef } from 'react';
import { BACKEND_URL } from "../config";
import { BackendGraphData, Button, ErrorNote, Icon, JobProgress, Panel, describeError, iconPaths } from "./common";

interface SidebarProps {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    onGraphDataReceived: (data: BackendGraphData) => void;
}

type InputMode = "examples" | "custom" | "upload";

const inputModes: { id: InputMode, label: string }[] = [
    { id: "examples", label: "Examples" },
    { id: "custom", label: "Custom" },
    { id: "upload", label: "Upload" },
];

const exampleCodes: Record<string, { name: string, n: number, k: number }> = {
    steane: { name: "Steane code", n: 7, k: 1 },
    "5_qubit": { name: "5-qubit code", n: 5, k: 1 },
    shor: { name: "Shor code", n: 9, k: 1 },
    r3x3: { name: "Rotated surface 3×3", n: 9, k: 1 },
    t2x2: { name: "Toric 2×2", n: 8, k: 2 },
    t3x3: { name: "Toric 3×3", n: 18, k: 2 },
};

const STABILIZER_PATTERN = /^[+-]?i?[IXYZ_]+$/;

const inputStyle = "w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";
const helpStyle = "text-sm text-ink-soft";


export default function Sidebar({ isOpen, onClose, onGraphDataReceived, onOpen }: SidebarProps) {

    const [inputMode, setInputMode] = useState<InputMode>("examples");
    const [selectedExample, setSelectedExample] = useState<string>("steane");
    const [n, setN] = useState<string>("");
    const [k, setK] = useState<string>("");
    const [currentStep, setCurrentStep] = useState<number>(1);

    const [inputs, setInputs] = useState<number[]>([]);
    const [adjacencyList, setAdjacencyList] = useState<Map<number, Set<number>>>(new Map());

    const [randomStabilizers, setRandomStabilizers] = useState<Boolean>(false);
    const [uploadedStabilizers, setUploadedStabilizers] = useState<Boolean>(false);
    const [uploadedDot, setUploadedDot] = useState<Boolean>(false);
    const [stabilizerValues, setStabilizerValues] = useState<string[]>([]);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string>("");

    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const stabilizerFileInputRef = useRef<HTMLInputElement>(null);
    const dotFileInputRef = useRef<HTMLInputElement>(null);

    const numN = parseInt(n) || 0;
    const numK = parseInt(k) || 0;

    let stabilizerCount = 0;

    if (numN > numK) {
        stabilizerCount = numN - numK;
    }

    const triggerStabilizerUpload = () => {
        stabilizerFileInputRef.current?.click();
    };

    const triggerDotUpload = () => {
        dotFileInputRef.current?.click();
    };

    const handleStabilizerFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result;
            if (typeof content === 'string') {
                const lines = content
                    .split(/\r?\n/)
                    .map(line => line.trim())
                    .filter(line => line !== '');

                if (lines.length > 0) {
                    setStabilizerValues(lines);
                    const first = lines[0] ?? "";
                    let charCounts = 0
                    for (const ch of first) {
                        if (ch === "I" || ch === "X" || ch === "Y" || ch === "Z") {
                            charCounts += 1
                        }
                    }

                    const n = charCounts
                    const k = (charCounts - lines.length)
                    if (n < k) {
                        setValidationError("Invalid stabilizers: n must be greater than or equal to k.");
                        return;
                    }

                    setN(n.toString())
                    setK(k.toString())
                    setUploadedStabilizers(true);
                    setCurrentStep(2);
                    setValidationError("");
                } else {
                    setValidationError("The file appears to be empty or invalid.");
                }
            }
        };
        reader.readAsText(file);

        event.target.value = '';
    };


    // Funzione helper per convertire la stringa DOT in dati del grafo
    const parseDotToGraph = (dot: string): { inputs: number[], adjacency_list: Map<number, Set<number>> } => {

        const trimmedDot = dot.trim();

        if (!trimmedDot.toLowerCase().startsWith("graph") && !trimmedDot.toLowerCase().startsWith("digraph")) {
            throw new Error("Invalid DOT format: Missing 'graph' or 'digraph' declaration.");
        }
        if (!trimmedDot.includes("{") || !trimmedDot.includes("}")) {
            throw new Error("Invalid DOT format: Missing opening or closing braces.");
        }


        const lines = trimmedDot.split(/\r?\n/);
        const inputs: number[] = [];
        const adjMap = new Map<number, Set<number>>();
        let maxId = -1;

        const addNode = (id: number) => {
            if (!adjMap.has(id)) adjMap.set(id, new Set());
            if (id > maxId) maxId = id;
        };

        lines.forEach(line => {
            line = line.trim();
            if (!line || line.startsWith("graph") || line.startsWith("}") || line.startsWith("layout") || line.startsWith("node")) return;

            const edgeMatch = line.match(/^(\d+)\s*--\s*(\d+)/);
            if (edgeMatch) {
                const u = parseInt(edgeMatch[1], 10);
                const v = parseInt(edgeMatch[2], 10);
                addNode(u);
                addNode(v);
                adjMap.get(u)?.add(v);
                adjMap.get(v)?.add(u);
                return;
            }

            const nodeMatch = line.match(/^(\d+)\s*\[(.*)\]/);
            if (nodeMatch) {
                const id = parseInt(nodeMatch[1], 10);
                const attrs = nodeMatch[2];
                addNode(id);

                if (attrs.includes('label="input"')) {
                    if (!inputs.includes(id)) inputs.push(id);
                }
                return;
            }
        });


        if (inputs.length === 0) {
            throw new Error("No input nodes found in the DOT file.");
        }

        if (adjMap.size === 0) {
            throw new Error("No edges found in the DOT file.");
        }

        return { inputs: inputs.sort((a, b) => a - b), adjacency_list: adjMap };
    };

    const handleDotFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) { return }

            try {
                const { inputs, adjacency_list } = parseDotToGraph(text);

                setN((adjacency_list.size - inputs.length).toString())
                setK((inputs.length).toString())
                setInputs(inputs);
                setAdjacencyList(adjacency_list);

                setUploadedDot(true);
                setUploadedStabilizers(false)
                setSelectedExample("")
                setCurrentStep(2);
                setValidationError("");
            } catch (error) {
                setValidationError("Error parsing DOT file");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };


    const handleNextClick = (random: Boolean) => {
        let stabilizerCount = 0;

        if (selectedExample === "") {
            if (numN <= numK || numN <= 0 || numK <= 0) {
                setValidationError("Enter positive whole numbers with n greater than k.");
                return;
            }
            stabilizerCount = numN - numK;

        } else {
        }

        setValidationError("");

        setStabilizerValues(Array(stabilizerCount).fill(""));
        setUploadedStabilizers(false);
        setCurrentStep(2);
        if (random) {
            setRandomStabilizers(true);
        } else {
            setRandomStabilizers(false);
        }
    };


    const handleModeChange = (mode: InputMode) => {
        if (mode === inputMode) return;
        setInputMode(mode);
        setSelectedExample(mode === "examples" ? "steane" : "");
        setValidationError("");
    };
    const handleExampleChange = (value: string) => {
        setSelectedExample(value);
        if (validationError) setValidationError("");
    };
    const handleNChange = (value: string) => {
        setN(value);
        if (validationError) setValidationError("");
    };
    const handleKChange = (value: string) => {
        setK(value);
        if (validationError) setValidationError("");
    };


    const handleStabilizerChange = (index: number, value: string) => {
        const newValues = [...stabilizerValues];
        newValues[index] = value;
        setStabilizerValues(newValues);
    };

    const handleStop = async () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        if (currentJobId) {
            try {
                await fetch(`${BACKEND_URL}/cancel/${currentJobId}`, {
                    method: "POST"
                });
            } catch (e) {
                console.error("Could not cancel the job:", e);
            }
        }

        setIsLoading(false);
        setCurrentJobId(null);
    };


    const handleSubmitToBackend = async () => {

        if (selectedExample === "" && randomStabilizers === false && !uploadedDot) {
            if (stabilizerValues.length === 0 || stabilizerValues.some(s => s.trim() === "")) {
                setValidationError("Please fill in every stabilizer before generating.");
                return;
            }
            const invalidIndex = stabilizerValues.findIndex(s =>
                !STABILIZER_PATTERN.test(s.trim()) || s.trim().replace(/^[+-]?i?/, "").length !== numN
            );
            if (invalidIndex !== -1) {
                setValidationError(`S${invalidIndex + 1} must be ${numN} characters long and use only I, X, Y and Z.`);
                return;
            }
        }
        setValidationError("");

        setIsLoading(true);
        setEstimatedTime(null);

        let dataToSend;

        if (uploadedDot) {
            const payload = Array.from(adjacencyList, ([node, neighbors]) => {
                return [node, Array.from(neighbors)];
            }); dataToSend = {
                inputs: inputs,
                adjacencyList: payload,
            };
        } else {
            dataToSend = {
                selectedExample: selectedExample,
                n: numN,
                k: numK,
                random: randomStabilizers,
                stabilizers: (selectedExample === "" || randomStabilizers === false) ? stabilizerValues.map(s => s.trim()) : []
            };

        }

        const failWith = (message: string) => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            setValidationError(message);
            setIsLoading(false);
            setCurrentJobId(null);
        };

        try {

            let startResponse;

            if (uploadedDot) {
                startResponse = await fetch(`${BACKEND_URL}/from_dot`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dataToSend),
                });
            } else {

                startResponse = await fetch(`${BACKEND_URL}/get_graph`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dataToSend),
                });
            }
            const startResult = await startResponse.json();

            if (!startResult.success || !startResult.job_id) {
                failWith(startResult.error || "The job could not be started.");
                return;
            }

            const jobId = startResult.job_id;
            setCurrentJobId(jobId);
            setEstimatedTime(startResult.estimated_time || null);

            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const statusResponse = await fetch(`${BACKEND_URL}/status/${jobId}`);
                    const statusResult = await statusResponse.json();

                    if (statusResult.success === false) {
                        failWith(statusResult.error || "The computation failed.");
                    } else if (statusResult.status != "processing") {
                        clearInterval(pollingIntervalRef.current!);
                        pollingIntervalRef.current = null;
                        onGraphDataReceived(statusResult.data);
                        setIsLoading(false);
                        setCurrentJobId(null);
                    }

                } catch (pollError) {
                    console.error("Polling error:", pollError);
                    failWith(describeError(pollError));
                }
            }, 500);

        } catch (error) {
            console.error("Connection error:", error);
            failWith(describeError(error));
        }
    };

    const handleGoBack = () => {
        setCurrentStep(1);
        setValidationError("");
        setRandomStabilizers(false);
        setUploadedStabilizers(false);
        setUploadedDot(false);
        setStabilizerValues([]);
    }

    const renderGenerate = () => (
        <div className="mt-4 flex flex-col gap-3">
            {validationError && <ErrorNote>{validationError}</ErrorNote>}
            {isLoading ? (
                <JobProgress
                    label={estimatedTime && estimatedTime >= 1 ? `Generating, about ${Math.round(estimatedTime)}s.` : "Generating..."}
                    onStop={handleStop}
                />
            ) : (
                <Button onClick={handleSubmitToBackend} className="w-full">
                    Generate graph
                </Button>
            )}
        </div>
    );

    const renderStabilizerStep = () => {
        let title;
        let description;

        if (randomStabilizers) {
            title = "Random code";
            description = "A random stabilizer code will be generated with these parameters.";
        } else if (uploadedStabilizers) {
            title = "Uploaded stabilizers";
            description = `Loaded ${stabilizerValues.length} stabilizers from your file.`;
        } else if (uploadedDot) {
            title = "Uploaded DOT graph";
            description = "The code will be computed from your graph.";
        } else {
            title = "Enter the stabilizers";
            description = `Use the letters I, X, Y and Z, with ${numN} per stabilizer.`;
        }

        const isManualEntry = !randomStabilizers && !uploadedStabilizers && !uploadedDot;

        return (
            <>
                <Button variant="ghost" onClick={handleGoBack} disabled={isLoading} className="-ml-2 mb-3 !py-1">
                    <Icon path={iconPaths.chevronLeft} />
                    Back
                </Button>

                <h3 className="font-medium">{title}</h3>
                <p className={`${helpStyle} mt-1`}>{description}</p>
                <p className="mt-3 font-mono text-sm text-ink-soft">n = {numN}, k = {numK}</p>

                {isManualEntry && (
                    <div className="mt-4 flex flex-col gap-2">
                        {stabilizerValues.map((value, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <label htmlFor={`stabilizer-${index}`} className="w-8 shrink-0 font-mono text-sm text-ink-soft">
                                    S<sub>{index + 1}</sub>
                                </label>
                                <input
                                    id={`stabilizer-${index}`}
                                    type="text"
                                    spellCheck={false}
                                    autoComplete="off"
                                    autoCapitalize="characters"
                                    className={`${inputStyle} font-mono`}
                                    placeholder={"I".repeat(Math.min(numN, 24))}
                                    value={value}
                                    onChange={(e) => handleStabilizerChange(index, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {renderGenerate()}
            </>
        );
    };

    const renderExamples = () => (
        <>
            <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Example codes">
                {Object.entries(exampleCodes).map(([id, code]) => {
                    const selected = selectedExample === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={isLoading}
                            onClick={() => handleExampleChange(id)}
                            className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed ${selected ? "border-accent bg-accent/10 text-ink" : "border-line text-ink-soft hover:border-ink-faint hover:text-ink"}`}
                        >
                            <span>{code.name}</span>
                            <span className="font-mono text-xs text-ink-faint">[[{code.n}, {code.k}]]</span>
                        </button>
                    );
                })}
            </div>
            {renderGenerate()}
        </>
    );

    const renderCustom = () => (
        <>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="code-n" className="mb-1 block text-sm text-ink-soft">Physical qubits n</label>
                    <input id="code-n" type="number" min="1" value={n} onChange={(e) => handleNChange(e.target.value)} placeholder="7" className={`${inputStyle} font-mono`} />
                </div>
                <div>
                    <label htmlFor="code-k" className="mb-1 block text-sm text-ink-soft">Logical qubits k</label>
                    <input id="code-k" type="number" min="1" value={k} onChange={(e) => handleKChange(e.target.value)} placeholder="1" className={`${inputStyle} font-mono`} />
                </div>
            </div>

            {validationError && <div className="mt-3"><ErrorNote>{validationError}</ErrorNote></div>}

            <div className="mt-4 flex flex-col gap-2">
                <Button onClick={() => handleNextClick(false)}>
                    Enter stabilizers
                    <Icon path={iconPaths.chevronRight} />
                </Button>
                <Button variant="secondary" onClick={() => handleNextClick(true)}>
                    Generate a random code
                </Button>
            </div>
        </>
    );

    const uploadTileStyle = "flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-ink-faint/60 px-3 py-4 text-center transition-colors hover:border-accent hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

    const renderUpload = () => (
        <>
            <div className="flex flex-col gap-3">
                <button onClick={triggerStabilizerUpload} className={uploadTileStyle} type="button">
                    <Icon path={iconPaths.upload} className="h-5 w-5 text-ink-soft" />
                    <span className="text-sm font-medium">Stabilizer file</span>
                    <span className="text-xs text-ink-faint">One stabilizer per line, such as XZZXI</span>
                </button>
                <input type="file" ref={stabilizerFileInputRef} className="hidden" onChange={handleStabilizerFileUpload} />

                <button onClick={triggerDotUpload} className={uploadTileStyle} type="button">
                    <Icon path={iconPaths.upload} className="h-5 w-5 text-ink-soft" />
                    <span className="text-sm font-medium">DOT graph file</span>
                    <span className="text-xs text-ink-faint">
                        Label input nodes with <code className="font-mono">label=&quot;input&quot;</code>
                    </span>
                </button>
                <input type="file" accept=".dot" ref={dotFileInputRef} className="hidden" onChange={handleDotFileUpload} />
            </div>

            {validationError && <div className="mt-3"><ErrorNote>{validationError}</ErrorNote></div>}
        </>
    );

    return (
        <Panel side="left" title="Load a code" openLabel="Load a code" isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
            {currentStep === 1 ? (
                <>
                    <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-canvas p-1" role="tablist" aria-label="Code source">
                        {inputModes.map((mode) => (
                            <button
                                key={mode.id}
                                type="button"
                                role="tab"
                                aria-selected={inputMode === mode.id}
                                disabled={isLoading}
                                onClick={() => handleModeChange(mode.id)}
                                className={`cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed ${inputMode === mode.id ? "bg-surface-raised text-ink shadow-sm" : "text-ink-faint hover:text-ink"}`}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>

                    {inputMode === "examples" && renderExamples()}
                    {inputMode === "custom" && renderCustom()}
                    {inputMode === "upload" && renderUpload()}
                </>
            ) : renderStabilizerStep()}
        </Panel>
    );
}
