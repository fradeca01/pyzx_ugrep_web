"use client";

const REPOSITORY_URL = "https://github.com/fradeca01/pyzx_ugrep_web";

export default function Header() {

    return (
        <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4">
            <button
                onClick={() => window.location.reload()}
                className="flex min-w-0 cursor-pointer items-center gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                title="Reload page"
            >
                <svg className="h-7 w-7 shrink-0" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                    <path d="M7 8L21 6M7 8l7 14M21 6l-7 16M7 8l14 9M14 22l7-5" stroke="var(--color-ink-faint)" strokeWidth="1.5" />
                    <circle cx="7" cy="8" r="3.5" fill="var(--color-input)" />
                    <circle cx="21" cy="6" r="3" fill="var(--color-accent)" />
                    <circle cx="14" cy="22" r="3" fill="var(--color-accent)" />
                    <circle cx="21" cy="17" r="3" fill="var(--color-accent)" />
                </svg>
                <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold sm:text-base">Universal Graph Representation</span>
                    <span className="hidden text-xs text-ink-faint sm:block">Stabilizer code visualizer</span>
                </span>
            </button>

            <a
                href={REPOSITORY_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-white/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55v-2.1c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
                </svg>
                <span className="hidden sm:inline">GitHub</span>
            </a>
        </header>
    );
}
