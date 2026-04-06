
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
// Added CheckCircle2 to the imports
import { Activity, Cpu, BarChart2, Layers, Zap, Search, CheckCircle2 } from 'lucide-react';

// --- PROCESS COORDINATION DIAGRAM ---
export const ProcessCoordinationDiagram: React.FC = () => {
  const [activeTasks, setActiveTasks] = useState<number[]>([]);
  
  // Adjacency: Node Index -> Related Dependency Checks
  const dependencyMap: Record<number, number[]> = {
    0: [0, 1],
    1: [0, 2],
    2: [1, 3],
    3: [2, 3],
    4: [0, 1, 2, 3],
  };

  const toggleTask = (id: number) => {
    setActiveTasks(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const completedChecks = [0, 1, 2, 3].filter(checkId => {
    let count = 0;
    Object.entries(dependencyMap).forEach(([nodeId, checks]) => {
        if (activeTasks.includes(parseInt(nodeId)) && checks.includes(checkId)) {
            count++;
        }
    });
    return count > 0;
  });

  return (
    <div className="flex flex-col items-center p-8 bg-white rounded-xl shadow-sm border border-stone-200 my-8">
      <h3 className="font-serif text-xl mb-4 text-stone-800">Process Coordination</h3>
      <p className="text-sm text-stone-500 mb-6 text-center max-w-md">
        Interactive visualization of task dependencies. Toggle <strong>Nodes</strong> to trigger <strong>Validation Checks</strong> across the system.
      </p>
      
      <div className="relative w-64 h-64 bg-[#F5F4F0] rounded-lg border border-stone-200 p-4 flex flex-wrap justify-between content-between relative">
         <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
            <div className="w-2/3 h-2/3 border border-stone-400"></div>
            <div className="absolute w-full h-[1px] bg-stone-400"></div>
            <div className="absolute h-full w-[1px] bg-stone-400"></div>
         </div>

         {[
             {id: 0, x: '50%', y: '20%', type: 'Plan', color: 'bg-blue-500'},
             {id: 1, x: '20%', y: '50%', type: 'Legal', color: 'bg-red-500'},
             {id: 2, x: '80%', y: '50%', type: 'Tech', color: 'bg-red-500'},
             {id: 3, x: '50%', y: '80%', type: 'Review', color: 'bg-blue-500'},
         ].map(check => (
             <motion.div
                key={`check-${check.id}`}
                className={`absolute w-12 h-12 -ml-6 -mt-6 flex items-center justify-center text-white text-[8px] uppercase tracking-tighter font-bold rounded-full shadow-sm transition-all duration-300 ${completedChecks.includes(check.id) ? check.color + ' opacity-100 scale-110 ring-4 ring-offset-2 ring-stone-200' : 'bg-stone-300 opacity-40'}`}
                style={{ left: check.x, top: check.y }}
             >
                 {check.type}
             </motion.div>
         ))}

         {[
             {id: 0, x: '20%', y: '20%'}, {id: 1, x: '80%', y: '20%'},
             {id: 4, x: '50%', y: '50%'}, 
             {id: 2, x: '20%', y: '80%'}, {id: 3, x: '80%', y: '80%'},
         ].map(node => (
             <button
                key={`node-${node.id}`}
                onClick={() => toggleTask(node.id)}
                className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-lg border-2 flex items-center justify-center transition-all duration-200 z-10 ${activeTasks.includes(node.id) ? 'bg-stone-800 border-stone-900 text-nobel-gold' : 'bg-white border-stone-300 hover:border-stone-500'}`}
                style={{ left: node.x, top: node.y }}
             >
                {activeTasks.includes(node.id) ? <Zap size={14} /> : <div className="w-1 h-1 bg-stone-300 rounded-full" />}
             </button>
         ))}
      </div>

      <div className="mt-6 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-stone-800"></div> Task</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> System</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> External</div>
      </div>
    </div>
  );
};

// --- WORKFLOW DIAGRAM ---
export const WorkflowDiagram: React.FC = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
        setStep(s => (s + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center p-8 bg-[#F5F4F0] rounded-xl border border-stone-200 my-8">
      <h3 className="font-serif text-xl mb-4 text-stone-900">Execution Workflow</h3>
      <p className="text-sm text-stone-600 mb-6 text-center max-w-md">
        From initial inquiry to final delivery, the advisory process follows a structured timeline.
      </p>

      <div className="relative w-full max-w-lg h-56 bg-white rounded-lg shadow-inner overflow-hidden mb-6 border border-stone-200 flex items-center justify-center gap-8 p-4">
        
        <div className="flex flex-col items-center gap-2">
            <div className={`w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-colors duration-500 ${step === 0 ? 'border-nobel-gold bg-nobel-gold/10' : 'border-stone-200 bg-stone-50'}`}>
                <Search size={24} className={step === 0 ? 'text-nobel-gold' : 'text-stone-300'} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Discovery</span>
        </div>

        <motion.div animate={{ opacity: step >= 1 ? 1 : 0.3, x: step >= 1 ? 0 : -5 }}>→</motion.div>

        <div className="flex flex-col items-center gap-2">
             <div className={`w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-colors duration-500 relative overflow-hidden ${step === 1 || step === 2 ? 'border-stone-800 bg-stone-900 text-white' : 'border-stone-200 bg-stone-50'}`}>
                <Layers size={24} className={step === 1 || step === 2 ? 'text-nobel-gold animate-pulse' : 'text-stone-300'} />
             </div>
             <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Planning</span>
        </div>

        <motion.div animate={{ opacity: step >= 3 ? 1 : 0.3, x: step >= 3 ? 0 : -5 }}>→</motion.div>

        <div className="flex flex-col items-center gap-2">
            <div className={`w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-colors duration-500 ${step === 3 ? 'border-stone-900 bg-stone-900' : 'border-stone-200 bg-stone-50'}`}>
                <CheckCircle2 size={24} className={step === 3 ? 'text-white' : 'text-stone-300'} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Delivery</span>
        </div>

      </div>

      <div className="flex gap-2">
          {[0, 1, 2, 3].map(s => (
              <div key={s} className={`h-1 rounded-full transition-all duration-300 ${step === s ? 'w-8 bg-nobel-gold' : 'w-2 bg-stone-300'}`}></div>
          ))}
      </div>
    </div>
  );
};

// --- EFFICIENCY CHART ---
export const EfficiencyDiagram: React.FC = () => {
    const [scenario, setScenario] = useState<1 | 2 | 3>(1);
    
    const data = {
        1: { unstructured: 85, structured: 30 },
        2: { unstructured: 92, structured: 25 },
        3: { unstructured: 78, structured: 20 } 
    };

    const currentData = data[scenario];
    const maxVal = 100;
    
    return (
        <div className="flex flex-col md:flex-row gap-8 items-center p-8 bg-stone-900 text-stone-100 rounded-xl my-8 border border-stone-800 shadow-lg">
            <div className="flex-1 min-w-[240px]">
                <h3 className="font-serif text-xl mb-2 text-nobel-gold">Efficiency Impact</h3>
                <p className="text-stone-400 text-sm mb-4 leading-relaxed">
                    Comparison of project timeline delays: Unstructured vs. Advisory-led planning (lower is faster).
                </p>
                <div className="flex gap-2 mt-6">
                    {[1, 2, 3].map((s) => (
                        <button 
                            key={s}
                            onClick={() => setScenario(s as any)} 
                            className={`px-3 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all duration-200 border ${scenario === s ? 'bg-nobel-gold text-stone-900 border-nobel-gold' : 'bg-transparent text-stone-400 border-stone-700 hover:border-stone-500 hover:text-stone-200'}`}
                        >
                            Case {s}
                        </button>
                    ))}
                </div>
                <div className="mt-6 font-mono text-[10px] text-stone-500 flex items-center gap-2 uppercase tracking-widest">
                    <BarChart2 size={14} className="text-nobel-gold" /> 
                    <span>Friction Reduction</span>
                </div>
            </div>
            
            <div className="relative w-64 h-72 bg-stone-800/50 rounded-xl border border-stone-700/50 p-6 flex justify-around items-end">
                <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none opacity-10">
                   {[...Array(5)].map((_, i) => <div key={i} className="w-full h-[1px] bg-stone-400"></div>)}
                </div>

                <div className="w-20 flex flex-col justify-end items-center h-full z-10">
                    <div className="flex-1 w-full flex items-end justify-center relative mb-3">
                        <motion.div 
                            className="w-full bg-stone-600 rounded-t-md border-t border-x border-stone-500/30"
                            initial={{ height: 0 }}
                            animate={{ height: `${(currentData.unstructured / maxVal) * 100}%` }}
                        />
                    </div>
                    <div className="h-6 flex items-center text-[8px] font-bold text-stone-500 uppercase tracking-widest">Ad-Hoc</div>
                </div>

                <div className="w-20 flex flex-col justify-end items-center h-full z-10">
                     <div className="flex-1 w-full flex items-end justify-center relative mb-3">
                        <motion.div 
                            className="w-full bg-nobel-gold rounded-t-md shadow-[0_0_20px_rgba(197,160,89,0.25)] relative overflow-hidden"
                            initial={{ height: 0 }}
                            animate={{ height: `${(currentData.structured / maxVal) * 100}%` }}
                        />
                    </div>
                     <div className="h-6 flex items-center text-[8px] font-bold text-nobel-gold uppercase tracking-widest">Aimal</div>
                </div>
            </div>
        </div>
    )
}
