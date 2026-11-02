'use client';

import React, { useState, useEffect, useRef } from "react";

import dynamic from "next/dynamic";
import { BackendGraphData } from "@/app/ui/common";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

interface GraphNode {
  id?: number | string;
  group?: number;
}

interface ForceGraphData {
  nodes: GraphNode[];
  links: { source: number | string; target: number | string; }[];
}

interface MainViewProps {
  backendGraphData: BackendGraphData | null;
}

// Three.js needs literal colors, so these mirror --color-input and --color-accent.
const INPUT_COLOR = "#f5b14c";
const NODE_COLOR = "#6cb6ff";
const LINK_COLOR = "#b0bccd";

const previewGraph = (): ForceGraphData => ({
  nodes: [
    { id: 0, group: 1 }, { id: 1, group: 0 }, { id: 2, group: 0 },
    { id: 3, group: 0 }, { id: 4, group: 0 }, { id: 5, group: 0 },
    { id: 6, group: 0 }
  ],
  links: [
    { source: 0, target: 1 }, { source: 1, target: 2 }, { source: 0, target: 2 }, // Triangolo 1
    { source: 3, target: 4 }, { source: 4, target: 5 }, { source: 3, target: 5 }, // Triangolo 2
    { source: 0, target: 3 }, { source: 1, target: 4 }, { source: 2, target: 5 }, // Connessioni tra i gruppi
    { source: 6, target: 0 }, { source: 6, target: 2 }, { source: 6, target: 4 }  // Centro connesso
  ]
});

// Funzione per trasformare i dati dalla lista di adiacenza
const transformBackendData = (data: BackendGraphData): ForceGraphData => {
  const nodes: GraphNode[] = [];
  const links: { source: number; target: number }[] = [];
  const nodeIds = new Set<number>();

  data.adjacency_list.forEach((neighbors, sourceId) => {
    nodeIds.add(sourceId);
    neighbors.forEach(targetId => {
      nodeIds.add(targetId);
      if (sourceId < targetId) {
        links.push({ source: sourceId, target: targetId });
      }
    });
  });

  nodeIds.forEach(id => {
    const isInputNode = data.inputs.includes(id);
    nodes.push({ id: id, group: isInputNode ? 1 : 0 });
  });

  return { nodes, links };
};

export default function MainView({ backendGraphData }: MainViewProps) {

  const [graphData, setGraphData] = useState<ForceGraphData>({ nodes: [], links: [] });
  const [size, setSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const angleRef = useRef(0);
  const fitPendingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    if (backendGraphData) {
      fitPendingRef.current = true;
      setGraphData(transformBackendData(backendGraphData));
    } else {
      setGraphData(previewGraph());

      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const rotate = () => {
          if (fgRef.current) {
            angleRef.current += 0.002; // Velocità rotazione
            const distance = 150; // Distanza dallo zero
            const x = distance * Math.sin(angleRef.current);
            const z = distance * Math.cos(angleRef.current);

            // Aggiorna la camera
            fgRef.current.cameraPosition({ x, z }, null, 0);
          }
          animationFrameId = requestAnimationFrame(rotate);
        };
        rotate();
      }
    }

    // Cleanup
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [backendGraphData]);

  const handleEngineStop = () => {
    if (fitPendingRef.current) {
      fitPendingRef.current = false;
      fgRef.current?.zoomToFit(600, 90);
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1a2a44_0%,var(--color-canvas)_70%)]"
    >
      {size.width > 0 && (
        <ForceGraph3D
          ref={fgRef}
          width={size.width}
          height={size.height}
          graphData={graphData}
          nodeLabel={(node: GraphNode) => `${node.group === 1 ? "Input" : "Node"} ${node.id}`}
          nodeColor={(node: GraphNode) => node.group === 1 ? INPUT_COLOR : NODE_COLOR}
          nodeVal={(node: GraphNode) => node.group === 1 ? 1.8 : 1}
          nodeRelSize={3.5}
          nodeOpacity={1}
          nodeResolution={24}
          linkColor={() => LINK_COLOR}
          linkOpacity={0.55}
          linkWidth={0.4}
          cooldownTicks={150}
          cooldownTime={3000}
          onEngineStop={handleEngineStop}
          backgroundColor="rgba(0,0,0,0)"
          showNavInfo={false}
        />
      )}

      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-4 rounded-full border border-line bg-surface/80 px-4 py-1.5 text-xs whitespace-nowrap text-ink-soft sm:flex">
        {backendGraphData ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-input" />
              Input
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              Internal
            </span>
            <span className="text-ink-faint">Drag to rotate, scroll to zoom</span>
          </>
        ) : (
          <span>Sample graph. Generate a code to see its representation.</span>
        )}
      </div>
    </div>
  );
}
