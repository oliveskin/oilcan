import React, { useMemo } from 'react';
import { SectorId, ThreatMarker, Intervention, FailureSeverity } from '../types';
import { Shield, AlertTriangle, Zap } from 'lucide-react';

interface ArenaMapProps {
  markers: ThreatMarker[];
  interventions: Intervention[];
  activeSector: SectorId | null;
  onSectorClick: (sector: SectorId) => void;
}

const SECTOR_CONFIG: Record<SectorId, { color: string, label: string, angle: number }> = {
  REASONING: { color: '#0ea5e9', label: 'REASONING', angle: -90 },
  TOOLS: { color: '#eab308', label: 'TOOLS', angle: -18 },
  CONTEXT: { color: '#a855f7', label: 'CONTEXT', angle: 54 },
  FEEDBACK: { color: '#f97316', label: 'FEEDBACK', angle: 126 },
  DEPLOYMENT: { color: '#ef4444', label: 'DEPLOYMENT', angle: 198 }
};

const ArenaMap: React.FC<ArenaMapProps> = ({ markers, interventions, activeSector, onSectorClick }) => {
  const center = 50; 
  const radius = 40; // Slightly smaller to fit UI

  const getWedgePath = (startAngle: number, endAngle: number, r: number = radius) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = center + r * Math.cos(toRad(startAngle));
    const y1 = center + r * Math.sin(toRad(startAngle));
    const x2 = center + r * Math.cos(toRad(endAngle));
    const y2 = center + r * Math.sin(toRad(endAngle));
    return `M ${center} ${center} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
  };

  const sectors = useMemo(() => {
    return (Object.keys(SECTOR_CONFIG) as SectorId[]).map((key, index) => {
      const startAngle = -126 + (index * 72);
      const endAngle = -126 + ((index + 1) * 72);
      
      const midAngle = startAngle + 36;
      const labelRad = (midAngle * Math.PI) / 180;
      const lx = center + (radius * 0.8) * Math.cos(labelRad);
      const ly = center + (radius * 0.8) * Math.sin(labelRad);

      return {
        id: key,
        path: getWedgePath(startAngle, endAngle),
        borderPath: getWedgePath(startAngle, endAngle, radius + 1), // Outer border
        color: SECTOR_CONFIG[key].color,
        labelX: lx,
        labelY: ly,
        ...SECTOR_CONFIG[key]
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center select-none overflow-hidden z-0">
      
      {/* Background Radar Rings - Keeping it centered */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
        <div className="w-[80vh] h-[80vh] border border-white/20 rounded-full"></div>
        <div className="w-[60vh] h-[60vh] border border-white/20 rounded-full absolute"></div>
        <div className="w-[40vh] h-[40vh] border border-white/20 rounded-full absolute"></div>
        <div className="w-full h-px bg-white/10 absolute"></div>
        <div className="h-full w-px bg-white/10 absolute"></div>
      </div>

      <svg viewBox="0 0 100 100" className="w-[90vh] h-[90vh] drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        
        {/* Render Sectors */}
        {sectors.map((sector) => (
          <g key={sector.id} onClick={() => onSectorClick(sector.id as SectorId)} className="cursor-pointer group">
            
            {/* Sector Fill */}
            <path
              d={sector.path}
              fill={sector.color}
              className={`transition-all duration-300 ${activeSector === sector.id ? 'fill-opacity-30' : 'fill-opacity-10'} group-hover:fill-opacity-20`}
              stroke="none"
            />
            
            {/* Sector Border (Only distinct edges) */}
            <path
               d={sector.path}
               fill="none"
               stroke={sector.color}
               strokeWidth="0.2"
               strokeOpacity="0.5"
            />

            {/* Sector Label */}
            <text
              x={sector.labelX}
              y={sector.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[2px] font-bold font-sans tracking-widest pointer-events-none fill-white/80"
              style={{ textShadow: '0 0 2px black' }}
            >
              {sector.id}
            </text>
            
            {activeSector === sector.id && (
              <circle cx={sector.labelX} cy={sector.labelY} r="0.5" fill={sector.color} className="animate-ping" />
            )}
          </g>
        ))}

        {/* Threat Markers */}
        {markers.map((marker) => {
          const color = SECTOR_CONFIG[marker.sector].color;
          return (
            <g key={marker.id}>
               <foreignObject x={marker.x - 2} y={marker.y - 2} width="4" height="4">
                  <div className={`w-full h-full flex items-center justify-center ${marker.severity === FailureSeverity.S4 ? 'animate-bounce' : ''}`}>
                     <div 
                        className={`w-1.5 h-1.5 transform rotate-45 border ${marker.severity === FailureSeverity.S4 ? 'bg-red-500 border-red-500' : 'bg-black/50'}`}
                        style={{ borderColor: color }}
                     ></div>
                  </div>
               </foreignObject>
            </g>
          );
        })}

        {/* Center Hub */}
        <circle cx="50" cy="50" r="1.5" className="fill-white/10 stroke-white/30 stroke-[0.2]" />
        
      </svg>
    </div>
  );
};

export default ArenaMap;
