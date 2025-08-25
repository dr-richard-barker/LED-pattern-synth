import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, Square, Save, Upload, Plus, Trash2, Copy, RotateCcw, Clock, Sun, Moon, Leaf, Sparkles, ChevronDown, Film, Sprout, BrainCircuit, BarChart2, Info, Maximize, Minimize } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import type { CellState, Keyframe, PredefinedPattern } from '../types';
import { CYCLE_DURATION, PATTERN_CATEGORIES } from '../constants';

const ICONS: { [key: string]: React.FC<any> } = { Leaf, Sprout, Sparkles };

const HorticulturalLEDDesigner: React.FC = () => {
  const [gridSize, setGridSize] = useState(8);
  const [currentGrid, setCurrentGrid] = useState<CellState[]>([]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(100);

  const [redValue, setRedValue] = useState(255);
  const [greenValue, setGreenValue] = useState(255);
  const [blueValue, setBlueValue] = useState(255);
  const [masterBrightness, setMasterBrightness] = useState(100);

  const [activePattern, setActivePattern] = useState({ categoryIndex: 0, patternIndex: 0 });
  
  const [keyframes, setKeyframes] = useState<Keyframe[]>(() => {
    const initialPattern = PATTERN_CATEGORIES[0].patterns[0];
    const kfSource = initialPattern.keyframes;
    const kfs = typeof kfSource === 'function' ? kfSource(8) : kfSource;
    return kfs.map(kf => ({
      ...kf,
      id: Date.now() + Math.random(),
    }));
  });
  const [selectedKeyframe, setSelectedKeyframe] = useState(0);
  
  const [greenProgram, setGreenProgram] = useState({ morning: false, midday: false, evening: false, night: false });
  const [redProgram, setRedProgram] = useState({ morning: false, midday: false, evening: false, night: false });
  const [blueProgram, setBlueProgram] = useState({ morning: false, midday: false, evening: false, night: false });
  const [dayNightCycle, setDayNightCycle] = useState({ start: 360, end: 1200 });
  
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showKeyframes, setShowKeyframes] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Gemini State
  const [showGemini, setShowGemini] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [geminiConfig, setGeminiConfig] = useState({
      goal: 'Maximize biomass for basil microgreens with strong purple coloration.',
      intensity: 'Medium',
      pulsing: 'None'
  });
  const [dli, setDli] = useState(0);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const updateGridFromTimeline = useCallback((time: number) => {
    if (keyframes.length === 0) return;

    const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);
    let prevKeyframe = sortedKeyframes[sortedKeyframes.length - 1];
    let nextKeyframe = sortedKeyframes[0];

    for (let i = 0; i < sortedKeyframes.length; i++) {
        const current = sortedKeyframes[i];
        const next = sortedKeyframes[i + 1] || sortedKeyframes[0];
        if (time >= current.time && (time < next.time || current.time >= next.time)) {
            prevKeyframe = current;
            nextKeyframe = next;
            break;
        }
    }
    
    let timeDiff = nextKeyframe.time - prevKeyframe.time;
    if (timeDiff < 0) timeDiff += CYCLE_DURATION;
    let timeProgress = time - prevKeyframe.time;
    if (timeProgress < 0) timeProgress += CYCLE_DURATION;
    const factor = timeDiff === 0 ? 0 : timeProgress / timeDiff;

    const interpolateColor = (color1: CellState, color2: CellState, factor: number): CellState => {
        if (!color1 || !color2) return color1 || color2 || { r: 0, g: 0, b: 0, active: false };
        return {
          r: Math.round(color1.r + (color2.r - color1.r) * factor),
          g: Math.round(color1.g + (color2.g - color1.g) * factor),
          b: Math.round(color1.b + (color2.b - color1.b) * factor),
          active: factor < 0.5 ? color1.active : color2.active
        };
    };

    const initialGrid = Array.from({ length: gridSize * gridSize }, (_, index) => {
        const prevCell = prevKeyframe.grid[index] || { r: 0, g: 0, b: 0, active: false };
        const nextCell = nextKeyframe.grid[index] || { r: 0, g: 0, b: 0, active: false };
        return interpolateColor(prevCell, nextCell, factor);
    });

    const hour = time / 60;
    let redBoost = 0, greenBoost = 0, blueBoost = 0;

    if (redProgram.morning && hour >= 6 && hour < 12) redBoost = 50;
    else if (redProgram.midday && hour >= 12 && hour < 18) redBoost = 50;
    else if (redProgram.evening && hour >= 18 && hour < 22) redBoost = 30;
    else if (redProgram.night && (hour >= 22 || hour < 6)) redBoost = 10;
    
    if (greenProgram.morning && hour >= 6 && hour < 12) greenBoost = 50;
    else if (greenProgram.midday && hour >= 12 && hour < 18) greenBoost = 50;
    else if (greenProgram.evening && hour >= 18 && hour < 22) greenBoost = 30;
    else if (greenProgram.night && (hour >= 22 || hour < 6)) greenBoost = 10;
    
    if (blueProgram.morning && hour >= 6 && hour < 12) blueBoost = 50;
    else if (blueProgram.midday && hour >= 12 && hour < 18) blueBoost = 50;
    else if (blueProgram.evening && hour >= 18 && hour < 22) blueBoost = 30;
    else if (blueProgram.night && (hour >= 22 || hour < 6)) blueBoost = 10;

    const finalGrid = initialGrid.map(cell => ({
        ...cell,
        r: Math.min(255, cell.r + redBoost),
        g: Math.min(255, cell.g + greenBoost),
        b: Math.min(255, cell.b + blueBoost)
    }));

    setCurrentGrid(finalGrid);
  }, [keyframes, gridSize, greenProgram, redProgram, blueProgram]);

  // Effect to handle resizing all keyframe grids when gridSize changes
  useEffect(() => {
    const newSize = gridSize * gridSize;
    setKeyframes(prevKeyframes => prevKeyframes.map(kf => ({
        ...kf,
        grid: Array.from({ length: newSize }, (_, i) => kf.grid[i] || { r: 0, g: 0, b: 0, active: false })
    })));
  }, [gridSize]);

  // Stabilized animation loop using setInterval
  useEffect(() => {
    if (isPlaying) {
      const intervalId = setInterval(() => {
        setCurrentTime(prev => (prev + 1) % CYCLE_DURATION);
      }, 1000 / (animationSpeed / 10));
      return () => clearInterval(intervalId);
    }
  }, [isPlaying, animationSpeed]);

  // Effect to update the grid display when time or keyframes change
  useEffect(() => {
      updateGridFromTimeline(currentTime);
  }, [currentTime, keyframes, updateGridFromTimeline]);

    // DLI Calculation Effect
    useEffect(() => {
        const PPFD_MAP: { [key: string]: number } = {
            'Low': 100,
            'Medium': 200,
            'High': 300,
            'Very High': 400
        };
        const ppfd = PPFD_MAP[geminiConfig.intensity] || 0;
        const photoperiodHours = (dayNightCycle.end - dayNightCycle.start) / 60;
        if (photoperiodHours <= 0) {
            setDli(0);
            return;
        }
        const photoperiodSeconds = photoperiodHours * 3600;
        const calculatedDli = (ppfd * photoperiodSeconds) / 1000000;
        setDli(calculatedDli);
    }, [geminiConfig.intensity, dayNightCycle]);
    
  useEffect(() => {
    const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

    const liveAnalysis = useMemo(() => {
        const activeCells = currentGrid.filter(c => c.active);
        if (activeCells.length === 0) {
            return { dominantSpectrum: 'Off', avgR: 0, avgG: 0, avgB: 0 };
        }
        const totals = activeCells.reduce((acc, cell) => {
            acc.r += cell.r;
            acc.g += cell.g;
            acc.b += cell.b;
            return acc;
        }, { r: 0, g: 0, b: 0 });

        const avgR = totals.r / activeCells.length;
        const avgG = totals.g / activeCells.length;
        const avgB = totals.b / activeCells.length;

        let dominantSpectrum = 'Balanced Mix';
        const threshold = 1.3; // 30% more than others
        if (avgR > avgG * threshold && avgR > avgB * threshold) dominantSpectrum = 'Red Dominant';
        else if (avgG > avgR * threshold && avgG > avgB * threshold) dominantSpectrum = 'Green Dominant';
        else if (avgB > avgR * threshold && avgB > avgG * threshold) dominantSpectrum = 'Blue Dominant';
        else if (Math.abs(avgR - avgG) < 25 && Math.abs(avgR - avgB) < 25 && avgR > 200) dominantSpectrum = 'Full Spectrum (White)';
        
        return { dominantSpectrum, avgR, avgG, avgB };
    }, [currentGrid]);

  const getAdjustedColor = useCallback((r: number, g: number, b: number): Omit<CellState, 'active'> => {
    const brightness = masterBrightness / 100;
    return {
      r: Math.round(r * brightness),
      g: Math.round(g * brightness),
      b: Math.round(b * brightness)
    };
  }, [masterBrightness]);
  
  const handleCellClick = (index: number) => {
    setSelectedCell(index);
    const newGrid = [...currentGrid];
    const adjustedColor = getAdjustedColor(redValue, greenValue, blueValue);
    newGrid[index] = { ...adjustedColor, active: !newGrid[index].active };
    setCurrentGrid(newGrid);
    
    if (keyframes[selectedKeyframe]) {
      const newKeyframes = [...keyframes];
      newKeyframes[selectedKeyframe].grid = [...newGrid];
      setKeyframes(newKeyframes);
    }
  };

  const loadPattern = useCallback((pattern: PredefinedPattern) => {
     const patternKeyframes = typeof pattern.keyframes === 'function' 
        ? pattern.keyframes(gridSize)
        : pattern.keyframes;

     const newKeyframes = patternKeyframes.map((kf: any) => ({
      ...kf,
      id: Date.now() + Math.random(),
    }));
    
    setKeyframes(newKeyframes);
    setSelectedKeyframe(0);
    const firstTime = newKeyframes.length > 0 ? newKeyframes[0].time : 0;
    setCurrentTime(firstTime);
    updateGridFromTimeline(firstTime); 
  }, [gridSize, updateGridFromTimeline]);
  
  const handlePatternSelect = (categoryIndex: number, patternIndex: number) => {
    setActivePattern({ categoryIndex, patternIndex });
    const pattern = PATTERN_CATEGORIES[categoryIndex].patterns[patternIndex];
    loadPattern(pattern);
  };
  
  const reloadCurrentPattern = () => {
    const pattern = PATTERN_CATEGORIES[activePattern.categoryIndex].patterns[activePattern.patternIndex];
    loadPattern(pattern);
  };

  const addKeyframe = () => {
    const newKeyframe: Keyframe = {
      id: Date.now(),
      time: Math.floor(currentTime),
      name: `Scene ${keyframes.length + 1}`,
      grid: [...currentGrid]
    };
    const newKeyframes = [...keyframes, newKeyframe].sort((a, b) => a.time - b.time);
    setKeyframes(newKeyframes);
    setSelectedKeyframe(newKeyframes.findIndex(k => k.id === newKeyframe.id));
  };

  const deleteKeyframe = (idToDelete: number) => {
    if (keyframes.length > 1) {
      const newKeyframes = keyframes.filter((kf) => kf.id !== idToDelete);
      setKeyframes(newKeyframes);
      if (selectedKeyframe >= newKeyframes.length) {
          setSelectedKeyframe(newKeyframes.length - 1);
      }
    }
  };

  const loadKeyframe = (index: number) => {
    setSelectedKeyframe(index);
    setCurrentTime(keyframes[index].time);
    setCurrentGrid([...keyframes[index].grid]);
  };

  const updateKeyframeTime = (id: number, newTime: number) => {
    const newKeyframes = keyframes.map(kf => 
        kf.id === id ? { ...kf, time: Math.max(0, Math.min(newTime, CYCLE_DURATION - 1)) } : kf
    );
    setKeyframes(newKeyframes.sort((a, b) => a.time - b.time));
  };

  const updateKeyframeName = (id: number, newName: string) => {
    const newKeyframes = keyframes.map(kf => 
        kf.id === id ? { ...kf, name: newName } : kf
    );
    setKeyframes(newKeyframes);
  };

  const fillAll = () => {
    const adjustedColor = getAdjustedColor(redValue, greenValue, blueValue);
    const newGrid = Array(gridSize * gridSize).fill(null).map(() => ({ 
      ...adjustedColor, active: true 
    }));
    setCurrentGrid(newGrid);
    if (keyframes[selectedKeyframe]) {
      const newKeyframes = [...keyframes];
      newKeyframes[selectedKeyframe].grid = [...newGrid];
      setKeyframes(newKeyframes);
    }
  };

  const clearAll = () => {
    const newGrid = Array(gridSize * gridSize).fill(null).map(() => ({ 
      r: 0, g: 0, b: 0, active: false 
    }));
    setCurrentGrid(newGrid);
    if (keyframes[selectedKeyframe]) {
      const newKeyframes = [...keyframes];
      newKeyframes[selectedKeyframe].grid = [...newGrid];
      setKeyframes(newKeyframes);
    }
  };
  
  const currentPatternName = PATTERN_CATEGORIES[activePattern.categoryIndex]?.patterns[activePattern.patternIndex]?.name || "Custom Recipe";

  const saveRecipe = () => {
    const recipe = {
      metadata: { name: currentPatternName, created: new Date().toISOString(), version: "1.0", gridSize, cycleDuration: CYCLE_DURATION, cycleUnit: "minutes", description: "Custom 24-hour lighting pattern" },
      keyframes: keyframes.map(kf => ({ id: kf.id, name: kf.name, time: kf.time, timeFormatted: formatTime(kf.time), grid: kf.grid.map(cell => ({ red: cell.r, green: cell.g, blue: cell.b, active: cell.active })) })),
      instructions: { microcontroller: "Compatible with Arduino/Raspberry Pi", notes: "24-hour cycle. Time values in minutes (0-1439). RGB values 0-255. Grid indexed row-major order.", example: "Use keyframe interpolation for smooth transitions between lighting phases." }
    };
    const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recipe.metadata.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadRecipe = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const recipe = JSON.parse(e.target?.result as string);
          if (recipe.keyframes) {
            const loadedKeyframes: Keyframe[] = recipe.keyframes.map((kf: any) => ({
              id: kf.id || Date.now() + Math.random(), name: kf.name, time: kf.time,
              grid: kf.grid.map((cell: any) => ({ r: cell.red, g: cell.green, b: cell.blue, active: cell.active }))
            }));
            if (recipe.metadata?.gridSize) setGridSize(recipe.metadata.gridSize);
            setActivePattern({ categoryIndex: 0, patternIndex: -1 }); // Indicate custom recipe
            setKeyframes(loadedKeyframes);
            setSelectedKeyframe(0);
            setCurrentTime(0);
            updateGridFromTimeline(0);
          }
        } catch (error) { alert('Error loading recipe file'); }
      };
      reader.readAsText(file);
    }
  };

    const handleExportVideo = async () => {
        if (!canvasRef.current) return;
        setIsRenderingVideo(true);
        setRenderProgress(0);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const stream = canvas.captureStream(30); // 30 FPS
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'led-animation.webm';
            a.click();
            URL.revokeObjectURL(url);
            setIsRenderingVideo(false);
        };

        recorder.start();

        const totalFrames = 720; // 24s video at 30fps (1440 minutes / 2 minutes per frame)
        for (let i = 0; i < totalFrames; i++) {
            const time = i * 2; // Each frame represents 2 minutes
            updateGridFromTimeline(time);
            
            // Allow state to update and then draw
            await new Promise(resolve => setTimeout(() => {
                const cellSize = canvas.width / gridSize;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                currentGrid.forEach((cell, index) => {
                    if (cell.active) {
                        const x = (index % gridSize) * cellSize;
                        const y = Math.floor(index / gridSize) * cellSize;
                        ctx.fillStyle = `rgb(${cell.r}, ${cell.g}, ${cell.b})`;
                        ctx.fillRect(x, y, cellSize, cellSize);
                    }
                });
                setRenderProgress(Math.round((i / totalFrames) * 100));
                resolve(true);
            }, 10));
        }

        recorder.stop();
    };

    const handleGenerateRecipe = async () => {
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `
                You are a world-class horticultural scientist specializing in LED lighting for controlled environment agriculture.
                Create a sophisticated 24-hour (1440 minute) horticultural light recipe for a full-panel LED array.
                
                Primary Goal: ${geminiConfig.goal}.
                Photoperiod: Lights must be on only between ${formatTime(dayNightCycle.start)} and ${formatTime(dayNightCycle.end)}.
                Target Intensity Level: ${geminiConfig.intensity}. This should influence the brightness (RGB values). 'High' should use values near 255. 'Low' should use values around 100-150.
                Pulsing Requirement: ${geminiConfig.pulsing}. If pulsing is requested, create short on/off keyframe pairs. A 'fast' pulse could be 5 minutes on, 5 minutes off. A 'slow' pulse could be 30 minutes on, 10 minutes off.
                
                The recipe must be for the entire 24-hour cycle. 
                - The first keyframe must be at the 'lights on' time: ${formatTime(dayNightCycle.start)}.
                - The final keyframe must be at the 'lights off' time: ${formatTime(dayNightCycle.end)}. The color for this keyframe must be black (r:0, g:0, b:0) and it must be inactive (active: false).
                - Create a smooth and logical progression of light spectrum and intensity between the on and off times.
                
                Generate a JSON object that strictly follows the provided schema. Do not output anything other than the JSON object.
            `;

            const keyframeColorSchema = {
                type: Type.OBJECT,
                properties: {
                    r: { type: Type.INTEGER, description: 'Red value from 0-255' },
                    g: { type: Type.INTEGER, description: 'Green value from 0-255' },
                    b: { type: Type.INTEGER, description: 'Blue value from 0-255' },
                    active: { type: Type.BOOLEAN, description: 'Whether the light is on or off' }
                },
                required: ["r", "g", "b", "active"]
            };

            const keyframeSchema = {
                type: Type.OBJECT,
                properties: {
                    time: { type: Type.INTEGER, description: `Time in minutes from 0 to 1439. Must be between ${dayNightCycle.start} and ${dayNightCycle.end}.` },
                    name: { type: Type.STRING, description: 'A descriptive name for the keyframe (e.g., "Morning Ramp-up", "Blue Pulse On")' },
                    color: keyframeColorSchema
                },
                required: ["time", "name", "color"]
            };

            const recipeSchema = {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: 'A creative, descriptive name for the recipe.' },
                    description: { type: Type.STRING, description: 'A brief scientific description of the recipe\'s purpose and method.' },
                    keyframes: {
                        type: Type.ARRAY,
                        items: keyframeSchema
                    }
                },
                required: ["name", "description", "keyframes"]
            };
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: recipeSchema,
                },
            });

            const generatedRecipe = JSON.parse(response.text);
            
            const newKeyframes = generatedRecipe.keyframes.map((kf: any) => ({
                id: Date.now() + Math.random(),
                time: kf.time,
                name: kf.name,
                grid: Array.from({ length: gridSize * gridSize }, () => ({
                    r: kf.color.r,
                    g: kf.color.g,
                    b: kf.color.b,
                    active: kf.color.active,
                }))
            }));

            if (newKeyframes.length > 0) {
              newKeyframes[0].time = dayNightCycle.start;
              const lastKf = newKeyframes[newKeyframes.length -1];
              lastKf.time = dayNightCycle.end;
              lastKf.grid = Array.from({ length: gridSize * gridSize }, () => ({ r: 0, g: 0, b: 0, active: false }));
            }
            
            const newPattern: PredefinedPattern = {
                name: generatedRecipe.name,
                description: generatedRecipe.description,
                keyframes: newKeyframes
            };
            
            loadPattern(newPattern);
            setActivePattern({ categoryIndex: 0, patternIndex: -1 }); // Custom pattern

        } catch (error) {
            console.error("Error generating recipe:", error);
            alert("Failed to generate recipe. This may be due to API key issues or a problem with the response. Please check the console for details.");
        } finally {
            setIsGenerating(false);
        }
    };

  const toggleFullscreen = () => {
    if (!gridContainerRef.current) return;
    if (!document.fullscreenElement) {
        gridContainerRef.current.requestFullscreen().catch(err => {
          alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }
  };


  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const getTimeOfDay = (minutes: number) => {
    const hour = Math.floor(minutes / 60);
    if (hour >= 6 && hour < 12) return { icon: Sun, text: "Morning", color: "text-yellow-600" };
    if (hour >= 12 && hour < 18) return { icon: Sun, text: "Afternoon", color: "text-orange-600" };
    if (hour >= 18 && hour < 22) return { icon: Sun, text: "Evening", color: "text-red-600" };
    return { icon: Moon, text: "Night", color: "text-blue-600" };
  };

  const timeIndicator = getTimeOfDay(currentTime);
  const TimeIcon = timeIndicator.icon;
  const currentAppliedColor = getAdjustedColor(redValue, greenValue, blueValue);

    const dayNightGradient = () => {
        const startPercent = (dayNightCycle.start / CYCLE_DURATION) * 100;
        const endPercent = (dayNightCycle.end / CYCLE_DURATION) * 100;
        return `linear-gradient(to right, #1e3a8a 0%, #1e3a8a ${startPercent}%, #fde047 ${startPercent + 2}%, #fde047 ${endPercent - 2}%, #1e3a8a ${endPercent}%, #1e3a8a 100%)`;
    };
    
    const Spectrometer = ({ avgR, avgG, avgB }: { avgR: number; avgG: number; avgB: number }) => {
        const width = 300;
        const height = 150;
        const peak = (cx: number, intensity: number, color: string) => {
            if (intensity === 0) return null;
            const peakHeight = (intensity / 255) * (height - 20);
            const peakWidth = 35;
            return <path d={`M ${cx - peakWidth} ${height - 10} C ${cx - peakWidth / 2} ${height - 10 - peakHeight}, ${cx + peakWidth / 2} ${height - 10 - peakHeight}, ${cx + peakWidth} ${height - 10}`} fill={color} stroke={color} strokeWidth="2" opacity="0.7"/>
        };
        return (
            <div className="bg-black rounded-lg p-4">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
                    <defs><linearGradient id="spectrum" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="15%" stopColor="#3b82f6" /><stop offset="40%" stopColor="#22c55e" /><stop offset="60%" stopColor="#facc15" /><stop offset="80%" stopColor="#f97316" /><stop offset="100%" stopColor="#ef4444" /></linearGradient></defs>
                    <rect x="0" y={height - 10} width={width} height="5" fill="url(#spectrum)" />
                    <g className="text-xs fill-gray-400">
                        <text x="5" y={height}>{400}</text>
                        <text x={width / 2 - 10} y={height}>550</text>
                        <text x={width - 25} y={height}>700nm</text>
                    </g>
                    <g className="text-xs fill-gray-400">
                        <text x="5" y="15">100%</text>
                        <line x1="25" y1="10" x2={width} y2="10" stroke="gray" strokeWidth="0.5" strokeDasharray="2" />
                        <text x="5" y={height / 2}>50%</text>
                         <line x1="25" y1={height/2-5} x2={width} y2={height/2-5} stroke="gray" strokeWidth="0.5" strokeDasharray="2" />
                    </g>
                    {peak(width * 0.25, avgB, '#3b82f6')}
                    {peak(width * 0.5, avgG, '#22c55e')}
                    {peak(width * 0.8, avgR, '#ef4444')}
                </svg>
            </div>
        )
    }
    
    const LiveSettings = () => {
        const timeOfDay = getTimeOfDay(currentTime).text.toLowerCase();
        const activePrograms = [
            redProgram[timeOfDay as keyof typeof redProgram] && 'Red',
            greenProgram[timeOfDay as keyof typeof greenProgram] && 'Green',
            blueProgram[timeOfDay as keyof typeof blueProgram] && 'Blue',
        ].filter(Boolean);
        
        return (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><Info size={18} />Live Settings</h3>
                <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between">
                        <span className="font-medium">Recipe:</span>
                        <span className="text-right font-mono truncate" title={currentPatternName}>{currentPatternName}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="font-medium">Spectrum:</span>
                        <span className="font-bold" style={{color: liveAnalysis.dominantSpectrum.includes('Red') ? '#ef4444' : liveAnalysis.dominantSpectrum.includes('Green') ? '#22c55e' : liveAnalysis.dominantSpectrum.includes('Blue') ? '#3b82f6' : 'inherit'}}>{liveAnalysis.dominantSpectrum}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="font-medium">Active Programs:</span>
                        <span>{activePrograms.length > 0 ? activePrograms.join(', ') : 'None'}</span>
                    </div>
                </div>
            </div>
        )
    }

  return (
    <>
     {isRenderingVideo && (
        <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Rendering Video...</h3>
            <p className="text-gray-600 mb-4">Please wait, this may take a moment.</p>
            <div className="w-64 bg-gray-200 rounded-full h-4">
              <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${renderProgress}%` }}></div>
            </div>
            <p className="text-xl font-mono mt-4">{renderProgress}%</p>
          </div>
        </div>
      )}
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen">
       <canvas ref={canvasRef} width="512" height="512" className="hidden"></canvas>
      <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-green-700">
          Advanced Horticultural & Creative LED Designer
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
             <LiveSettings />
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">LED Array</h2>
                <button onClick={toggleFullscreen} title="Toggle Fullscreen" className="p-2 text-gray-500 hover:text-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
              </div>
              <div className="mb-4 p-3 bg-white rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2"><Clock size={18} className="text-gray-600" /><span className="font-mono text-lg">{formatTime(currentTime)}</span></div>
                <div className={`flex items-center gap-1 ${timeIndicator.color}`}><TimeIcon size={16} /><span className="text-sm font-medium">{timeIndicator.text}</span></div>
              </div>
              <div className="mb-4"><label htmlFor="grid-size-slider" className="block text-sm font-medium text-gray-700 mb-2">Grid Size: {gridSize}x{gridSize}</label><input id="grid-size-slider" type="range" min="4" max="36" step="2" value={gridSize} onChange={(e) => setGridSize(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" /></div>
              <div ref={gridContainerRef} className="bg-black p-2 sm:p-3 rounded-lg mb-4">
                <div className="grid gap-px mx-auto w-full" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, aspectRatio: '1' }}>{currentGrid.map((cell, index) => (<button key={index} onClick={() => handleCellClick(index)} className={`rounded-sm border transition-all duration-300 ${ selectedCell === index ? 'border-yellow-400 border-2' : 'border-gray-600/50'} ${cell.active ? 'shadow-lg' : 'opacity-30'}`} style={{ backgroundColor: cell.active ? `rgb(${cell.r}, ${cell.g}, ${cell.b})` : '#1f2937', boxShadow: cell.active ? `0 0 8px rgba(${cell.r}, ${cell.g}, ${cell.b}, 0.5)` : 'none', aspectRatio: '1' }} aria-label={`LED ${index + 1}`} />))}</div>
              </div>
              <div className="flex gap-2 mb-4"><button onClick={fillAll} className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">Fill All</button><button onClick={clearAll} className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Clear All</button></div>
              <div className="bg-white p-3 rounded-lg"><h3 className="text-sm font-semibold text-gray-700 mb-2">24-Hour Cycle Control</h3><div className="relative h-6 rounded-full" style={{background: dayNightGradient()}}><input type="range" min="0" max={CYCLE_DURATION -1} value={currentTime} onChange={(e) => setCurrentTime(parseInt(e.target.value))} className="absolute inset-0 w-full h-full bg-transparent appearance-none cursor-pointer" style={{'WebkitAppearance': 'none'}} aria-label="Timeline Scrubber"/></div><div className="flex justify-between text-xs text-gray-600 mt-1"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
                <div className="mt-4 space-y-2"><div><label htmlFor="lights-on-slider" className="block text-xs font-medium text-gray-600">Lights On: {formatTime(dayNightCycle.start)}</label><input id="lights-on-slider" type="range" min="0" max={CYCLE_DURATION - 1} value={dayNightCycle.start} onChange={e => setDayNightCycle(d => ({ ...d, start: Math.min(parseInt(e.target.value), d.end) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/></div><div><label htmlFor="lights-off-slider" className="block text-xs font-medium text-gray-600">Lights Off: {formatTime(dayNightCycle.end)}</label><input id="lights-off-slider" type="range" min="0" max={CYCLE_DURATION - 1} value={dayNightCycle.end} onChange={e => setDayNightCycle(d => ({ ...d, end: Math.max(parseInt(e.target.value), d.start) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/></div></div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-100 p-4 rounded-lg h-full">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Spectrum Controls</h2>
              <div className="space-y-4">
                {PATTERN_CATEGORIES.map((category, catIndex) => {
                  const Icon = ICONS[category.icon];
                  return (
                    <div key={category.name}>
                      <h3 className="text-lg font-semibold mb-2 text-gray-800 flex items-center gap-2">
                        <Icon size={18} /> {category.name}
                      </h3>
                      <select 
                        value={activePattern.categoryIndex === catIndex ? activePattern.patternIndex : -1} 
                        onChange={(e) => handlePatternSelect(catIndex, parseInt(e.target.value))} 
                        className="w-full p-2 border rounded-lg bg-white"
                      >
                        <option value={-1} disabled>Select...</option>
                        {category.patterns.map((p, pIndex) => (<option key={pIndex} value={pIndex}>{p.name}</option>))}
                      </select>
                      <p className="text-xs text-gray-600 mt-1 h-8">
                        {(activePattern.categoryIndex === catIndex && activePattern.patternIndex !== -1) && category.patterns[activePattern.patternIndex]?.description}
                      </p>
                    </div>
                  );
                })}
              </div>

               <div className="my-6 p-4 bg-white rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                    <BarChart2 size={18} />Simulated PAR Spectrometer
                  </h3>
                  <Spectrometer avgR={liveAnalysis.avgR} avgG={liveAnalysis.avgG} avgB={liveAnalysis.avgB} />
               </div>

              <div className="p-4 bg-white rounded-lg space-y-4">
                <div><h3 className="text-lg font-semibold mb-2 text-green-700">Green Light Program</h3><div className="grid grid-cols-2 gap-2 text-sm">{Object.keys(greenProgram).map(key => (<label key={key} className="flex items-center gap-2 text-green-800 font-medium"><input type="checkbox" checked={greenProgram[key as keyof typeof greenProgram]} onChange={e => setGreenProgram(p => ({...p, [key]: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>{key.charAt(0).toUpperCase() + key.slice(1)}</label>))}</div></div>
                <div><h3 className="text-lg font-semibold mb-2 text-red-700">Red Light Program</h3><div className="grid grid-cols-2 gap-2 text-sm">{Object.keys(redProgram).map(key => (<label key={key} className="flex items-center gap-2 text-red-800 font-medium"><input type="checkbox" checked={redProgram[key as keyof typeof redProgram]} onChange={e => setRedProgram(p => ({...p, [key]: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"/>{key.charAt(0).toUpperCase() + key.slice(1)}</label>))}</div></div>
                <div><h3 className="text-lg font-semibold mb-2 text-blue-700">Blue Light Program</h3><div className="grid grid-cols-2 gap-2 text-sm">{Object.keys(blueProgram).map(key => (<label key={key} className="flex items-center gap-2 text-blue-800 font-medium"><input type="checkbox" checked={blueProgram[key as keyof typeof blueProgram]} onChange={e => setBlueProgram(p => ({...p, [key]: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>{key.charAt(0).toUpperCase() + key.slice(1)}</label>))}</div></div>
              </div>
              <div className="space-y-4 mb-6">
                <div><label htmlFor="red-slider" className="block text-sm font-medium text-gray-700 mb-1">Red: {redValue}</label><input id="red-slider" type="range" min="0" max="255" value={redValue} onChange={(e) => setRedValue(parseInt(e.target.value))} className="w-full h-3 bg-gradient-to-r from-black to-red-500 rounded-lg appearance-none cursor-pointer"/></div>
                <div><label htmlFor="green-slider" className="block text-sm font-medium text-gray-700 mb-1">Green: {greenValue}</label><input id="green-slider" type="range" min="0" max="255" value={greenValue} onChange={(e) => setGreenValue(parseInt(e.target.value))} className="w-full h-3 bg-gradient-to-r from-black to-green-500 rounded-lg appearance-none cursor-pointer"/></div>
                <div><label htmlFor="blue-slider" className="block text-sm font-medium text-gray-700 mb-1">Blue: {blueValue}</label><input id="blue-slider" type="range" min="0" max="255" value={blueValue} onChange={(e) => setBlueValue(parseInt(e.target.value))} className="w-full h-3 bg-gradient-to-r from-black to-blue-500 rounded-lg appearance-none cursor-pointer"/></div>
                <div><label htmlFor="intensity-slider" className="block text-sm font-medium text-gray-700 mb-1">Intensity: {masterBrightness}%</label><input id="intensity-slider" type="range" min="0" max="100" value={masterBrightness} onChange={(e) => setMasterBrightness(parseInt(e.target.value))} className="w-full h-3 bg-gradient-to-r from-gray-800 to-yellow-300 rounded-lg appearance-none cursor-pointer"/></div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg"><span className="text-sm font-medium text-gray-700">Current:</span><div className="w-16 h-16 rounded-lg border-2 border-gray-300" style={{ backgroundColor: `rgb(${currentAppliedColor.r}, ${currentAppliedColor.g}, ${currentAppliedColor.b})`, boxShadow: `0 0 15px rgba(${currentAppliedColor.r}, ${currentAppliedColor.g}, ${currentAppliedColor.b}, 0.5)` }} /><div className="text-xs text-gray-600"><div>RGB({currentAppliedColor.r}, {currentAppliedColor.g}, {currentAppliedColor.b})</div></div></div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1"><div className="bg-gray-100 p-4 rounded-lg h-full flex flex-col"><h2 className="text-xl font-semibold mb-4 text-gray-800">24-Hour Timeline</h2><div className="mb-6 bg-white p-3 rounded-lg"><div className="flex items-center gap-3 mb-3"><button onClick={() => setIsPlaying(!isPlaying)} className={`p-3 rounded-lg ${isPlaying ? 'bg-red-500' : 'bg-green-500'} text-white transition-colors`} aria-label={isPlaying ? 'Pause animation' : 'Play animation'}>{isPlaying ? <Pause size={20} /> : <Play size={20} />}</button><button onClick={() => { setIsPlaying(false); setCurrentTime(0); }} className="p-3 rounded-lg bg-gray-600 text-white hover:bg-gray-700" aria-label="Stop animation"><Square size={20} /></button><button onClick={reloadCurrentPattern} className="p-3 rounded-lg bg-gray-600 text-white hover:bg-gray-700" aria-label="Reset pattern"><RotateCcw size={20} /></button></div><div><label htmlFor="speed-slider" className="text-sm font-medium text-gray-700">Animation Speed: {Math.round(animationSpeed / 10)}x</label><input id="speed-slider" type="range" min="10" max="1000" value={animationSpeed} onChange={(e) => setAnimationSpeed(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg mt-1 appearance-none cursor-pointer"/></div></div>
            <div className="flex-grow overflow-y-auto pr-2">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-800">Keyframes</h3>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={showKeyframes} onChange={e => setShowKeyframes(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span>Visible</span>
                </label>
              </div>
              {showKeyframes && (
                <div className="space-y-3">
                  {keyframes.map((kf, index) => (<div key={kf.id} className={`p-3 rounded-lg border-2 ${selectedKeyframe === index ? 'bg-blue-100 border-blue-400' : 'bg-white border-transparent'}`}><div className="flex justify-between items-center mb-2"><input type="text" value={kf.name} onChange={(e) => updateKeyframeName(kf.id, e.target.value)} className="font-semibold bg-transparent rounded p-1 w-2/3 text-gray-900 focus:bg-white focus:ring-1 focus:ring-blue-400"/><div className="flex gap-2"><button onClick={() => loadKeyframe(index)} className="text-gray-500 hover:text-blue-600" aria-label={`Copy keyframe ${kf.name}`}><Copy size={16} /></button><button onClick={() => deleteKeyframe(kf.id)} className="text-gray-500 hover:text-red-600" aria-label={`Delete keyframe ${kf.name}`}><Trash2 size={16} /></button></div></div><div className="flex items-center gap-2"><span className="text-sm font-mono text-gray-800">{formatTime(kf.time)}</span><input type="range" min="0" max={CYCLE_DURATION - 1} value={kf.time} onChange={(e) => {setCurrentTime(parseInt(e.target.value)); updateKeyframeTime(kf.id, parseInt(e.target.value))}} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" aria-label={`Time for keyframe ${kf.name}`} /></div></div>))}
                </div>
              )}
            </div>
            <div className="mt-4"><button onClick={addKeyframe} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"><Plus size={18} />Add Keyframe at {formatTime(currentTime)}</button></div></div></div>
        </div>

        <div className="mt-8 space-y-4">
             <div>
                <button onClick={() => setShowGemini(!showGemini)} className="w-full text-left font-semibold text-lg text-gray-700 p-4 bg-gray-100 rounded-lg hover:bg-gray-200 flex justify-between items-center transition-colors">
                    <span className="flex items-center gap-3"><BrainCircuit className="text-purple-600"/>Gemini-Based Recipe Generator</span>
                    <ChevronDown className={`transition-transform duration-300 ${showGemini ? 'rotate-180' : ''}`} />
                </button>
                {showGemini && (<div className="mt-2 p-6 bg-white border border-gray-200 rounded-lg text-gray-800 space-y-6">
                    <div>
                        <label htmlFor="gemini-goal" className="block text-sm font-bold text-gray-700 mb-2">Describe Your Desired Growth Outcome</label>
                        <textarea 
                            id="gemini-goal"
                            value={geminiConfig.goal}
                            onChange={e => setGeminiConfig(c => ({ ...c, goal: e.target.value }))}
                            className="w-full p-2 border rounded-lg bg-white" 
                            rows={3}
                            placeholder="e.g., 'Maximize biomass for radish microgreens with compact growth and deep red stems.'"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="gemini-intensity" className="block text-sm font-bold text-gray-700 mb-2">Target Intensity</label>
                            <select id="gemini-intensity" value={geminiConfig.intensity} onChange={e => setGeminiConfig(c => ({ ...c, intensity: e.target.value }))} className="w-full p-2 border rounded-lg bg-white">
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                                <option>Very High</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="gemini-pulsing" className="block text-sm font-bold text-gray-700 mb-2">Light Pulsing</label>
                            <select id="gemini-pulsing" value={geminiConfig.pulsing} onChange={e => setGeminiConfig(c => ({ ...c, pulsing: e.target.value }))} className="w-full p-2 border rounded-lg bg-white">
                                <option>None</option>
                                <option>Slow Pulses</option>
                                <option>Fast Pulses</option>
                                <option>Varied Pulses</option>
                            </select>
                        </div>
                    </div>
                    <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                        <h4 className="font-bold text-gray-800">Estimated Daily Light Integral (DLI)</h4>
                        <p className="text-2xl font-mono text-blue-700">{dli.toFixed(2)} <span className="text-base">mol/m²/day</span></p>
                        <p className="text-xs text-gray-600 mt-1">Based on your selected intensity and photoperiod ({formatTime(dayNightCycle.start)} - {formatTime(dayNightCycle.end)}). This is a key metric for predicting plant growth.</p>
                    </div>
                    <button 
                        onClick={handleGenerateRecipe} 
                        disabled={isGenerating}
                        className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 disabled:bg-purple-400 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? 'Generating...' : 'Generate AI Recipe'}
                    </button>
                </div>)}
            </div>

            <button onClick={() => setShowTutorial(!showTutorial)} className="w-full text-left font-semibold text-lg text-gray-700 p-4 bg-gray-100 rounded-lg hover:bg-gray-200 flex justify-between items-center transition-colors"><span>How to Use This Tool</span><ChevronDown className={`transition-transform duration-300 ${showTutorial ? 'rotate-180' : ''}`} /></button>
            {showTutorial && (<div className="mt-2 p-6 bg-white border border-gray-200 rounded-lg text-gray-800 space-y-6">
                    <div><h3 className="text-xl font-bold text-green-700 mb-2">Welcome to the Advanced LED Designer!</h3><p>This tool helps you create and visualize 24-hour lighting recipes for plants or create fun animations for LED matrix panels. You design everything using a timeline with keyframes.</p></div>
                    <div><h4 className="font-bold text-lg mb-2">1. LED Array Panel</h4><ul className="list-disc list-inside space-y-1 pl-2"><li><strong>Grid Size:</strong> Adjust the slider to set your LED panel dimensions, now up to 36x36.</li><li><strong>Interactive Grid:</strong> Click on any cell in the black grid to turn it on or off with the color from "Spectrum Controls".</li><li><strong>24-Hour Cycle Control:</strong> The main bar shows the current time. Drag its slider to scrub through time. Use the "Lights On" and "Lights Off" sliders below it to visually define your day length on the bar's background.</li></ul></div>
                    <div><h4 className="font-bold text-lg mb-2">2. Spectrum Controls Panel</h4><ul className="list-disc list-inside space-y-1 pl-2"><li><strong>Pattern Libraries:</strong> Choose from three libraries: "Research-Based" for general horticulture, "Microgreen-Based" for specialized recipes, or "Fun-Based" for creative animations.</li><li><strong>Gemini-Based Generator:</strong> Describe your horticultural goals in plain English, and let AI generate a recipe for you!</li><li><strong>Light Programs:</strong> Check boxes (Red, Green, Blue) to add a non-destructive light overlay during specific times of the day, useful for fine-tuning plant responses.</li><li><strong>Color Sliders:</strong> Use the Red, Green, Blue, and Intensity sliders to select the exact color and brightness you want to apply to the grid.</li></ul></div>
                    <div><h4 className="font-bold text-lg mb-2">3. 24-Hour Timeline Panel</h4><ul className="list-disc list-inside space-y-1 pl-2"><li><strong>Animation Controls:</strong> Play, pause, and stop the simulation. The reset button reloads the currently selected pattern from one of the libraries.</li><li><strong>Keyframes:</strong> This is the core of your design. Each keyframe is a snapshot of the LED grid at a specific time. The app smoothly transitions between them. Use the 'Visible' checkbox to hide/show this list.</li><li><strong>Editing Keyframes:</strong> Click on a keyframe to load it for editing. You can then change its name, adjust its time with the slider, and modify the LED grid in the Array Panel.</li><li><strong>Add Keyframe:</strong> Position the main time slider where you want a new scene, design your grid, and click "Add Keyframe" to save it.</li></ul></div>
                    <div><h4 className="font-bold text-lg mb-2">4. Global Actions (Bottom)</h4><ul className="list-disc list-inside space-y-1 pl-2"><li><strong>Export/Import:</strong> Save your custom creation as a JSON file, or load a previously saved file.</li><li><strong>Export as Video:</strong> Renders the entire 24-hour animation as a video file for easy sharing.</li></ul></div>
            </div>)}
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-center mb-4 text-gray-800">Global Actions</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={saveRecipe} className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"><Save size={18} /> Export Recipe</button>
              <button onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"><Upload size={18} /> Import Recipe</button>
              <button onClick={handleExportVideo} className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 transition-colors"><Film size={18} /> Export as Video</button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={loadRecipe} className="hidden"/>
            </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default HorticulturalLEDDesigner;