'use client';

import React, { useState } from "react";
import Sidebar from "@/app/ui/Sidebar";
import PropertyBar from "@/app/ui/PropertyBar";
import MainView from "@/app/ui/MainView";
import CircuitDrawer from "@/app/ui/CircuitDrawer";
import { BackendGraphData } from "@/app/ui/common";

// Below this width the two panels would cover each other, so only one stays open.
const isNarrowScreen = () => window.matchMedia("(max-width: 767px)").matches;

export default function Home() {
    const [isSidebarOpen, setSidebarOpen] = useState<boolean>(true);
    const [isRightSidebarOpen, setRightSidebarOpen] = useState<boolean>(false);
    const [backendGraphData, setBackendGraphData] = useState<BackendGraphData | null>(null);
    const [isCircuitDrawerOpen, setCircuitDrawerOpen] = useState<boolean>(false);

    const graphInserted = (data: BackendGraphData | null) => {
        setBackendGraphData(data);
        // On a phone the panels would hide the new graph, so show the graph first.
        if (isNarrowScreen()) {
            setSidebarOpen(false);
            setRightSidebarOpen(false);
        } else {
            setRightSidebarOpen(true);
        }
    }

    const openSidebar = () => {
        setSidebarOpen(true);
        if (isNarrowScreen()) setRightSidebarOpen(false);
    }

    const openRightSidebar = () => {
        setRightSidebarOpen(true);
        if (isNarrowScreen()) setSidebarOpen(false);
    }

    return (
        <div className="absolute inset-0 overflow-hidden">
            <MainView backendGraphData={backendGraphData} />
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onOpen={openSidebar}
                onGraphDataReceived={graphInserted}
            />
            <PropertyBar
                isOpen={isRightSidebarOpen}
                onClose={() => setRightSidebarOpen(false)}
                onOpen={openRightSidebar}
                backendGraphData={backendGraphData}
                onOpenEncoder={() => setCircuitDrawerOpen(true)}
            />
            <CircuitDrawer
                isOpen={isCircuitDrawerOpen}
                onClose={() => setCircuitDrawerOpen(false)}
                qasmData={backendGraphData}
            />
        </div>
    )
}
