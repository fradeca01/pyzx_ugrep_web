"use client";

import { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from "../config";
import { BackendGraphData, Button, ErrorNote, Icon, JobProgress, Panel, describeError, iconPaths } from "./common";

interface PropertyBarProps {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    onOpenEncoder: () => void;
    backendGraphData: BackendGraphData | null;
}

const Stat = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="rounded-lg border border-line bg-surface-raised px-3 py-2">
        <dt className="text-xs text-ink-faint">{label}</dt>
        <dd className="mt-0.5 font-mono text-lg font-medium">{value}</dd>
    </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="mb-2 text-xs font-semibold tracking-wider text-ink-faint uppercase">{children}</h3>
);

export default function PropertyBar({ isOpen, onClose, onOpen, onOpenEncoder, backendGraphData }: PropertyBarProps) {

    const [isComputing, setIsComputing] = useState(false);
    const [computedDistance, setComputedDistance] = useState<number | null>(null);
    const [solverError, setSolverError] = useState<string>("");
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    const [currentJobId, setCurrentJobId] = useState<string | null>(null);


    useEffect(() => {
        setComputedDistance(null);
        setSolverError("");
        setIsComputing(false);
        if (pollInterval.current) clearInterval(pollInterval.current);
    }, [backendGraphData]);

    const generateDotString = (data: BackendGraphData): string => {
        const inputsSet = new Set(data.inputs);
        let dot = "graph G {\n";
        dot += '  layout=neato;\n';
        dot += '  node [style=filled];\n';

        data.adjacency_list.forEach((_, id) => {
            const isInput = inputsSet.has(id);
            const inputLabel = isInput ? "label=\"input\"" : "";
            const color = isInput ? "lightblue" : "lightgrey";
            const shape = isInput ? "box" : "circle";
            dot += `  ${id} [${inputLabel}, fillcolor="${color}", shape="${shape}"];\n`;
        });

        data.adjacency_list.forEach((neighbors, source) => {
            neighbors.forEach((target) => {
                if (source < target) {
                    dot += `  ${source} -- ${target};\n`;
                }
            });
        });

        dot += "}";
        return dot;
    };

    const handleDownloadDot = () => {
        if (!backendGraphData) return;

        const dotString = generateDotString(backendGraphData);
        const blob = new Blob([dotString], { type: 'text/vnd.graphviz' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'graph_representation.dot';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleComputeClick = async () => {
        if (!backendGraphData) return;

        setIsComputing(true);
        setComputedDistance(null);
        setSolverError("");

        const failWith = (message: string) => {
            if (pollInterval.current) clearInterval(pollInterval.current);
            pollInterval.current = null;
            setSolverError(message);
            setIsComputing(false);
        };

        try {
            const response = await fetch(`${BACKEND_URL}/solve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inputs: backendGraphData.inputs,
                    adjacency_list: backendGraphData.adjacency_list
                })
            });

            const result = await response.json();

            if (!result.success) {
                failWith(result.error);
                return;
            }

            const jobId = result.job_id;
            setCurrentJobId(jobId);

            pollInterval.current = setInterval(async () => {
                try {
                    const statusRes = await fetch(`${BACKEND_URL}/status/${jobId}`);
                    const statusData = await statusRes.json();

                    if (statusData.success === false) {
                        failWith(statusData.error);
                    } else if (statusData.status != "processing") {
                        setComputedDistance(statusData.data);
                        setIsComputing(false);
                        clearInterval(pollInterval.current!);
                        pollInterval.current = null;
                    }
                } catch (e) {
                    console.error("Polling error", e);
                    failWith(describeError(e));
                }
            }, 1000);

        } catch (e) {
            console.error(e);
            failWith(describeError(e));
        }
    };

    const handleStop = async () => {
        if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
        }

        setIsComputing(false);

        if (currentJobId) {
            try {
                await fetch(`${BACKEND_URL}/cancel/${currentJobId}`, {
                    method: "POST"
                });
            } catch (e) {
                console.error("Could not cancel the job:", e);
            }
        }

        setCurrentJobId(null);
    };

    const renderContent = () => {
        if (!backendGraphData) {
            return (
                <p className="text-sm text-ink-soft">
                    Generate a code to see its parameters, compute its distance and view its encoder circuit.
                </p>
            );
        }

        const nodeCount = backendGraphData.adjacency_list.length;
        const k = backendGraphData.inputs.length;
        const n = nodeCount - k;
        const edgeCount = backendGraphData.adjacency_list.reduce((total, neighbors) => total + neighbors.length, 0) / 2;
                const stabilizers = backendGraphData.stabilizers ?? [];

        return (
            <div className="flex flex-col gap-5">
                <div>
                    <p className="font-mono text-2xl font-medium" title="[[n, k, d]]">
                        [[{n}, {k}, {computedDistance ?? (
                            <>
                                <span className="text-[0.8em]">≤</span>
                                {backendGraphData.distance_upper_bound}
                            </>
                        )}]]
                    </p>
                    <dl className="mt-3 grid grid-cols-3 gap-2">
                        <Stat label="Qubits n" value={n} />
                        <Stat label="Logical k" value={k} />
                        <Stat label="Edges" value={edgeCount} />
                    </dl>
                </div>

                <section>
                    <SectionTitle>Distance</SectionTitle>
                    <dl className="mb-3 grid grid-cols-2 gap-2">
                        <Stat label="Upper bound" value={backendGraphData.distance_upper_bound} />
                        <Stat label="Exact" value={computedDistance ?? "?"} />
                    </dl>

                    {isComputing ? (
                        <JobProgress label="Computing, this may take a while." onStop={handleStop} />
                    ) : computedDistance === null && (
                        <Button onClick={handleComputeClick} className="w-full">
                            Compute exact distance
                        </Button>
                    )}

                    {solverError && <div className="mt-3"><ErrorNote>{solverError}</ErrorNote></div>}
                </section>

                <section>
                    <SectionTitle>Encoder and exports</SectionTitle>
                    <div className="flex flex-col gap-2">
                        <Button variant="secondary" onClick={onOpenEncoder}>
                            View encoder circuit
                        </Button>
                        <Button variant="secondary" onClick={handleDownloadDot} title="Download GraphViz DOT file">
                            <Icon path={iconPaths.download} />
                            Download DOT
                        </Button>
                    </div>
                </section>

                {stabilizers.length > 0 && (
                    <details className="group">
                        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold tracking-wider text-ink-faint uppercase hover:text-ink [&::-webkit-details-marker]:hidden">
                            <Icon path={iconPaths.chevronRight} className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                            Stabilizers ({stabilizers.length})
                        </summary>
                        <ol className="mt-2 max-h-48 overflow-auto rounded-lg border border-line bg-canvas p-2 font-mono text-xs leading-relaxed text-ink-soft">
                            {stabilizers.map((stabilizer, index) => (
                                <li key={index} className="whitespace-nowrap">{String(stabilizer)}</li>
                            ))}
                        </ol>
                    </details>
                )}
            </div>
        );
    };

    return (
        <Panel side="right" title="Code properties" openLabel="Properties" isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
            {renderContent()}
        </Panel>
    );
}
