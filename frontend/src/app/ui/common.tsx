"use client";

import React from "react";

export interface BackendGraphData {
    inputs: number[];
    adjacency_list: number[][];
    distance_upper_bound: number;
    distance_lower_bound?: number;
    stabilizers?: string[];
    qasmEncoder: string;
}

// fetch() throws a TypeError when the server is unreachable. An offline tunnel answers with an HTML page instead of JSON.
export const describeError = (error: unknown): string => {
    if (error instanceof TypeError || error instanceof SyntaxError) {
        return "Can't reach the backend. It may be offline, please try again later.";
    }
    return error instanceof Error ? error.message : "Something went wrong.";
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const buttonVariants = {
    primary: "bg-accent font-semibold text-canvas hover:bg-accent-strong",
    secondary: "border border-line bg-surface-raised font-medium text-ink hover:border-accent/60",
    ghost: "font-medium text-ink-soft hover:bg-white/5 hover:text-ink",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: keyof typeof buttonVariants;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
    return (
        <button
            type="button"
            className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing} ${buttonVariants[variant]} ${className}`}
            {...props}
        />
    );
}

export function Icon({ path, className = "h-4 w-4" }: { path: string; className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
    );
}

export const iconPaths = {
    chevronLeft: "M15 19l-7-7 7-7",
    chevronRight: "M9 5l7 7-7 7",
    close: "M6 18L18 6M6 6l12 12",
    download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
    upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
};

interface PanelProps {
    side: "left" | "right";
    title: string;
    openLabel: string;
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    children: React.ReactNode;
}

export function Panel({ side, title, openLabel, isOpen, onOpen, onClose, children }: PanelProps) {
    const isLeft = side === "left";
    const edge = isLeft ? "left-3" : "right-3";
    const hidden = isLeft ? "invisible -translate-x-[calc(100%+1rem)]" : "invisible translate-x-[calc(100%+1rem)]";

    return (
        <>
            {!isOpen && (
                <Button
                    variant="secondary"
                    onClick={onOpen}
                    className={`absolute bottom-3 z-20 shadow-lg md:top-3 md:bottom-auto ${edge}`}
                    aria-label={openLabel}
                >
                    {isLeft && <Icon path={iconPaths.chevronRight} />}
                    {openLabel}
                    {!isLeft && <Icon path={iconPaths.chevronLeft} />}
                </Button>
            )}

            <aside
                className={`
                    absolute top-3 z-20 flex max-h-[calc(100%-4.5rem)] w-[min(21rem,calc(100vw-1.5rem))] flex-col md:max-h-[calc(100%-1.5rem)]
                    rounded-xl border border-line bg-surface/95 shadow-2xl shadow-black/40 backdrop-blur-sm
                    transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none
                    ${edge} ${isOpen ? "visible translate-x-0" : hidden}
                `}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-line py-2 pr-2 pl-4">
                    <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
                    <Button variant="ghost" onClick={onClose} className="!p-1.5" aria-label={`Hide ${title.toLowerCase()}`} title="Hide panel">
                        <Icon path={isLeft ? iconPaths.chevronLeft : iconPaths.chevronRight} />
                    </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
            </aside>
        </>
    );
}

export function JobProgress({ label, onStop }: { label: string; onStop: () => void }) {
    return (
        <div role="status" className="rounded-lg border border-line bg-surface-raised p-3">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink-soft">{label}</p>
                <Button variant="ghost" onClick={onStop} className="!px-2 !py-1 !text-danger hover:!bg-danger/10">
                    Stop
                </Button>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="animate-progress h-full w-2/5 rounded-full bg-accent" />
            </div>
        </div>
    );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
    return (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-red-200">
            {children}
        </p>
    );
}
