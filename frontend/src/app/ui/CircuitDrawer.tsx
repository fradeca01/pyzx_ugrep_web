"use client";

import React, { useEffect, useMemo } from "react";
import { BackendGraphData, Button, Icon, iconPaths } from "./common";

interface Gate {
    type: string;
    qubits: number[]; 
    controls?: number[]; 
    params?: string;
}

interface ParsedCircuit {
    numQubits: number;
    columns: Gate[][];
    initialStates: string[];
}

const parseQASM = (qasm: string, inputCount: number): ParsedCircuit => {
    const lines = qasm.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('OPENQASM') && !l.startsWith('include'));

    let numQubits = 0;
    const gates: Gate[] = [];

    const qregRegex = /qreg\s+\w+\[(\d+)\];/;
    const gateRegex = /(\w+)\s+([^;]+);/;

    lines.forEach(line => {
        const qregMatch = line.match(qregRegex);
        if (qregMatch) {
            numQubits = Math.max(numQubits, parseInt(qregMatch[1], 10));
            return;
        }

        const match = line.match(gateRegex);
        if (match) {
            const type = match[1].toLowerCase();
            const args = match[2].split(',').map(s => s.trim());

            const indices = args.map(arg => {
                const idxMatch = arg.match(/\[(\d+)\]/);
                return idxMatch ? parseInt(idxMatch[1], 10) : 0;
            });

            if (type === 'cx') {
                gates.push({ type: 'X', qubits: [indices[1]], controls: [indices[0]] });
            } else if (type === 'cz') {
                gates.push({ type: 'Z', qubits: [indices[1]], controls: [indices[0]] });
            } else if (['h', 'x', 'y', 'z', 's', 't', 'tdg'].includes(type)) {
                gates.push({ type: type.toUpperCase(), qubits: [indices[0]] });
            } else if (type === 'measure') {
                const measureSource = args[0].match(/\[(\d+)\]/);
                if (measureSource) {
                    gates.push({ type: 'M', qubits: [parseInt(measureSource[1], 10)] });
                }
            }
        }
    });

    if (numQubits === 0 && gates.length > 0) {
        numQubits = Math.max(...gates.flatMap(g => [...g.qubits, ...(g.controls || [])])) + 1;
    }

    const initialStates: string[] = Array.from(
        { length: numQubits },
        (_, qubit) => qubit < inputCount ? "|in⟩" : "|0⟩"
    );
    const touched = Array(numQubits).fill(false);
    const visualGates: Gate[] = [];

    gates.forEach(gate => {
        const affectedQubits = [...gate.qubits, ...(gate.controls || [])];
        const isInitialAncillaHadamard =
            gate.type === "H" &&
            !gate.controls &&
            gate.qubits[0] >= inputCount &&
            !touched[gate.qubits[0]];

        if (isInitialAncillaHadamard) {
            initialStates[gate.qubits[0]] = "|+⟩";
            touched[gate.qubits[0]] = true;
            return;
        }

        visualGates.push(gate);
        affectedQubits.forEach(qubit => {
            touched[qubit] = true;
        });
    });

    // Gates share a column when the wires they span do not overlap, which keeps the circuit compact.
    const nextFreeColumn = Array(numQubits).fill(0);
    const columns: Gate[][] = [];

    visualGates.forEach(gate => {
        const wires = [...gate.qubits, ...(gate.controls || [])];
        const top = Math.min(...wires);
        const bottom = Math.max(...wires);

        let column = 0;
        for (let wire = top; wire <= bottom; wire++) {
            column = Math.max(column, nextFreeColumn[wire]);
        }
        for (let wire = top; wire <= bottom; wire++) {
            nextFreeColumn[wire] = column + 1;
        }

        if (!columns[column]) columns[column] = [];
        columns[column].push(gate);
    });

    return { numQubits, columns, initialStates };
};
interface CircuitDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    qasmData: BackendGraphData | null;
}

export default function CircuitDrawer({ isOpen, onClose, qasmData }: CircuitDrawerProps) {

    const circuit = useMemo(() => {
        if (!qasmData) return null;
        try {
            return parseQASM(qasmData.qasmEncoder || "", qasmData.inputs.length);
        } catch (e) {
            console.error("Parsing error", e);
            return null;
        }
    }, [qasmData]);

    useEffect(() => {
        if (!isOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [isOpen, onClose]);

    const ROW_H = 40;
    const COL_W = 40;
    const START_X = 110;
    const START_Y = 28;

    const gateCount = circuit ? circuit.columns.reduce((total, col) => total + col.length, 0) : 0;

    const gateColor = (type: string) => {
        if (type === 'X') return 'var(--color-gate-x)';
        if (type === 'H') return 'var(--color-accent)';
        if (type === 'M') return 'var(--color-danger)';
        return 'var(--color-gate-z)';
    };

    const handleDownload = () => {
        if (!qasmData?.qasmEncoder) return;
        const blob = new Blob([qasmData.qasmEncoder], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'circuit.qasm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <div
                onClick={onClose}
                className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 motion-reduce:transition-none ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Encoder circuit"
                className={`
                    fixed right-0 bottom-0 left-0 z-50 flex h-[75dvh] flex-col
                    rounded-t-2xl border-t border-line bg-surface shadow-2xl shadow-black/60
                    transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none
                    ${isOpen ? 'visible translate-y-0' : 'invisible translate-y-full'}
                `}
            >
                <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line py-3 pr-3 pl-5">
                    <div className="min-w-0">
                        <h2 className="font-semibold">Encoder circuit</h2>
                        {circuit && circuit.numQubits > 0 && (
                            <p className="font-mono text-xs text-ink-faint">{circuit.numQubits} qubits, {gateCount} gates</p>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                        <Button variant="secondary" onClick={handleDownload} disabled={!qasmData}>
                            <Icon path={iconPaths.download} />
                            <span className="hidden sm:inline">Download QASM</span>
                        </Button>
                        <Button variant="ghost" onClick={onClose} aria-label="Close circuit" title="Close (Esc)">
                            <Icon path={iconPaths.close} className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-canvas p-6">

                    {!circuit || circuit.numQubits === 0 ? (
                        <p className="mt-10 text-center text-sm text-ink-soft">
                            {qasmData ? "Unable to parse this circuit." : "No circuit available."}
                        </p>
                    ) : (
                        <svg
                            width={START_X + circuit.columns.length * COL_W + 40}
                            height={START_Y * 2 + (circuit.numQubits - 1) * ROW_H}
                            className="mx-auto font-mono"
                        >
                            {Array.from({ length: circuit.numQubits }).map((_, i) => (
                                <g key={`wire-${i}`}>
                                    <text x={START_X - 12} y={START_Y + i * ROW_H + 4} fontSize="13" textAnchor="end" fill="var(--color-ink-soft)">
                                        <tspan fill="var(--color-ink-faint)">{`q${i} `}</tspan>
                                        {circuit.initialStates[i]}
                                    </text>
                                    <line
                                        x1={START_X}
                                        y1={START_Y + i * ROW_H}
                                        x2={START_X + circuit.columns.length * COL_W + 40}
                                        y2={START_Y + i * ROW_H}
                                        stroke="var(--color-line)"
                                        strokeWidth="1.5"
                                    />
                                </g>
                            ))}

                            {circuit.columns.map((col, colIdx) => {
                                const x = START_X + colIdx * COL_W + (COL_W / 2);

                                return col.map((gate, gateIdx) => {
                                    const y = START_Y + gate.qubits[0] * ROW_H;
                                    const color = gateColor(gate.type);

                                    if (!gate.controls) {
                                        return (
                                            <g key={`gate-${colIdx}-${gateIdx}`}>
                                                <rect x={x - 14} y={y - 14} width={28} height={28} fill="var(--color-surface-raised)" stroke={color} strokeWidth="1.5" rx="5" />
                                                <text x={x} y={y + 5} textAnchor="middle" fill={color} fontSize="13" fontWeight="600">{gate.type}</text>
                                            </g>
                                        );
                                    }

                                    const yControl = START_Y + gate.controls[0] * ROW_H;

                                    return (
                                        <g key={`cgate-${colIdx}-${gateIdx}`}>
                                            <line x1={x} y1={yControl} x2={x} y2={y} stroke={color} strokeWidth="1.5" />
                                            <circle cx={x} cy={yControl} r={5} fill={color} />
                                            {gate.type === 'X' ? (
                                                <g>
                                                    <circle cx={x} cy={y} r={11} fill="var(--color-surface-raised)" stroke={color} strokeWidth="1.5" />
                                                    <line x1={x} y1={y - 7} x2={x} y2={y + 7} stroke={color} strokeWidth="1.5" />
                                                    <line x1={x - 7} y1={y} x2={x + 7} y2={y} stroke={color} strokeWidth="1.5" />
                                                </g>
                                            ) : gate.type === 'Z' ? (
                                                <circle cx={x} cy={y} r={5} fill={color} />
                                            ) : (
                                                <g>
                                                    <rect x={x - 14} y={y - 14} width={28} height={28} fill="var(--color-surface-raised)" stroke={color} strokeWidth="1.5" rx="5" />
                                                    <text x={x} y={y + 5} textAnchor="middle" fill={color} fontSize="13" fontWeight="600">{gate.type}</text>
                                                </g>
                                            )}
                                        </g>
                                    );
                                });
                            })}
                        </svg>
                    )}
                </div>
            </div>
        </>
    );
}
