import type { PredefinedPattern, PatternCategory, CellState } from './types';

export const CYCLE_DURATION: number = 1440;

// --- Helper Functions for Dynamic Grids ---

const fullGrid = (gridSize: number, color: Partial<CellState>): CellState[] => 
  Array.from({ length: gridSize * gridSize }, () => ({ r: 0, g: 0, b: 0, active: false, ...color }));

const nightGrid = (gridSize: number) => fullGrid(gridSize, { r: 0, g: 0, b: 0, active: false });

const PREDEFINED_PATTERNS: PredefinedPattern[] = [
  {
    name: "Leafy Greens (Lettuce/Spinach)",
    description: "Blue-heavy spectrum for compact growth",
    keyframes: (gridSize: number) => [
      { time: 360, name: "Morning", grid: fullGrid(gridSize, { r: 100, g: 150, b: 255, active: true }) },
      { time: 480, name: "Peak Growth", grid: fullGrid(gridSize, { r: 150, g: 200, b: 255, active: true }) },
      { time: 1080, name: "Evening", grid: fullGrid(gridSize, { r: 80, g: 120, b: 200, active: true }) },
      { time: 1200, name: "Night", grid: nightGrid(gridSize) }
    ]
  },
  {
    name: "Flowering Plants (Tomato/Pepper)",
    description: "Red-dominant spectrum for fruit development",
    keyframes: (gridSize: number) => [
      { time: 300, name: "Dawn", grid: fullGrid(gridSize, { r: 255, g: 100, b: 50, active: true }) },
      { time: 420, name: "Morning Growth", grid: fullGrid(gridSize, { r: 255, g: 150, b: 100, active: true }) },
      { time: 900, name: "Peak Flowering", grid: fullGrid(gridSize, { r: 255, g: 120, b: 80, active: true }) },
      { time: 1140, name: "Dusk", grid: fullGrid(gridSize, { r: 200, g: 80, b: 40, active: true }) },
      { time: 1260, name: "Night", grid: nightGrid(gridSize) }
    ]
  },
  {
    name: "Seedling Development",
    description: "Balanced spectrum for early growth",
    keyframes: (gridSize: number) => [
      { time: 420, name: "Gentle Dawn", grid: fullGrid(gridSize, { r: 180, g: 200, b: 220, active: true }) },
      { time: 600, name: "Growth Phase", grid: fullGrid(gridSize, { r: 200, g: 220, b: 240, active: true }) },
      { time: 1020, name: "Gentle Dusk", grid: fullGrid(gridSize, { r: 160, g: 180, b: 200, active: true }) },
      { time: 1140, name: "Night Rest", grid: nightGrid(gridSize) }
    ]
  },
  {
    name: "Herbs (Basil/Mint)",
    description: "High blue content for essential oils",
    keyframes: (gridSize: number) => [
      { time: 360, name: "Morning Blue", grid: fullGrid(gridSize, { r: 80, g: 120, b: 255, active: true }) },
      { time: 480, name: "Growth Boost", grid: fullGrid(gridSize, { r: 120, g: 160, b: 255, active: true }) },
      { time: 960, name: "Afternoon", grid: fullGrid(gridSize, { r: 100, g: 140, b: 220, active: true }) },
      { time: 1080, name: "Evening", grid: fullGrid(gridSize, { r: 60, g: 100, b: 180, active: true }) },
      { time: 1200, name: "Night", grid: nightGrid(gridSize) }
    ]
  },
  {
    name: "Natural Sunlight Simulation",
    description: "Mimics natural solar patterns",
    keyframes: (gridSize: number) => [
      { time: 300, name: "Sunrise", grid: fullGrid(gridSize, { r: 255, g: 180, b: 100, active: true }) },
      { time: 480, name: "Morning", grid: fullGrid(gridSize, { r: 255, g: 220, b: 180, active: true }) },
      { time: 720, name: "Midday", grid: fullGrid(gridSize, { r: 255, g: 255, b: 255, active: true }) },
      { time: 960, name: "Afternoon", grid: fullGrid(gridSize, { r: 255, g: 240, b: 200, active: true }) },
      { time: 1140, name: "Sunset", grid: fullGrid(gridSize, { r: 255, g: 150, b: 80, active: true }) },
      { time: 1260, name: "Night", grid: nightGrid(gridSize) }
    ]
  },
  {
    name: "High-Light Vegetables",
    description: "Intense lighting for fruiting vegetables",
    keyframes: (gridSize: number) => [
      { time: 240, name: "Early Dawn", grid: fullGrid(gridSize, { r: 200, g: 100, b: 50, active: true }) },
      { time: 360, name: "Dawn Peak", grid: fullGrid(gridSize, { r: 255, g: 150, b: 100, active: true }) },
      { time: 720, name: "High Intensity", grid: fullGrid(gridSize, { r: 255, g: 200, b: 150, active: true }) },
      { time: 1020, name: "Sustained Growth", grid: fullGrid(gridSize, { r: 255, g: 180, b: 120, active: true }) },
      { time: 1200, name: "Dusk", grid: fullGrid(gridSize, { r: 180, g: 100, b: 60, active: true }) },
      { time: 1320, name: "Night", grid: nightGrid(gridSize) }
    ]
  }
];

// --- Fun Patterns ---

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

const generateRainbowGrid = (gridSize: number, waveOffset: number): CellState[] => {
  const grid: CellState[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const hue = ((x + y) / (gridSize * 1.5) + waveOffset) % 1;
      const color = hsvToRgb(hue, 1, 1);
      grid.push({ ...color, active: true });
    }
  }
  return grid;
};

const generateHeartGrid = (gridSize: number, color: { r: number, g: number, b: number }): CellState[] => {
    const grid = Array.from({ length: gridSize * gridSize }, (): CellState => ({ r: 0, g: 0, b: 0, active: false }));
    const heartIndices8x8 = [10, 11, 14, 15, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 34, 35, 36, 37, 38, 43, 44, 45, 52];
    
    if (gridSize < 8) return grid;

    const offsetX = Math.floor((gridSize - 8) / 2);
    const offsetY = Math.floor((gridSize - 8) / 2);

    for (const index8x8 of heartIndices8x8) {
        const x8 = index8x8 % 8;
        const y8 = Math.floor(index8x8 / 8);
        const newIndex = (y8 + offsetY) * gridSize + (x8 + offsetX);
        if (grid[newIndex]) {
            grid[newIndex] = { ...color, active: true };
        }
    }
    return grid;
};

const generateMatrixFrame = (gridSize: number, frame: number): CellState[] => {
    return Array.from({ length: gridSize * gridSize }, (_, i) => {
        const x = i % gridSize;
        const y = Math.floor(i / gridSize);
        const columnHash = ((x * 13) ^ (x * 7)) % 11;
        const hasRain = columnHash < 3; 

        if (hasRain) {
            const speed = 1 + (columnHash % 3);
            const dripHead = (frame * speed + x * 5) % (gridSize + 5) - 5;
            
            if (y >= dripHead - 1 && y <= dripHead) {
                return { r: 180, g: 255, b: 180, active: true };
            } else if (y > dripHead - (gridSize / 4) && y < dripHead - 1) {
                const fade = 1 - ((dripHead - y) / (gridSize / 4));
                return { r: 0, g: Math.floor(30 + 150 * fade), b: 0, active: true };
            }
        }
        return { r: 0, g: 30, b: 0, active: true };
    });
};

const FUN_BASED_PATTERNS: PredefinedPattern[] = [
  {
    name: "Rainbow Wave",
    description: "A psychedelic diagonal wave of colors.",
    keyframes: (gridSize: number) => [
      { time: 0, name: "Wave Start", grid: generateRainbowGrid(gridSize, 0) },
      { time: 360, name: "Wave Mid", grid: generateRainbowGrid(gridSize, 0.25) },
      { time: 720, name: "Wave Peak", grid: generateRainbowGrid(gridSize, 0.5) },
      { time: 1080, name: "Wave End", grid: generateRainbowGrid(gridSize, 0.75) },
    ]
  },
  {
    name: "Pulsing Heart",
    description: "A lovely beating heart.",
    keyframes: (gridSize: number) => [
      { time: 0, name: "Pulse Out", grid: generateHeartGrid(gridSize, {r: 255, g: 20, b: 20}) },
      { time: 720, name: "Pulse In", grid: generateHeartGrid(gridSize, {r: 150, g: 10, b: 10}) },
    ]
  },
   {
    name: "Matrix Rain",
    description: "Digital rain effect. Best on larger grids.",
    keyframes: (gridSize: number) => [
      { time: 0, name: "Drip 1", grid: generateMatrixFrame(gridSize, 0) },
      { time: 360, name: "Drip 2", grid: generateMatrixFrame(gridSize, 10) },
      { time: 720, name: "Drip 3", grid: generateMatrixFrame(gridSize, 20) },
      { time: 1080, name: "Drip 4", grid: generateMatrixFrame(gridSize, 30) },
    ]
  }
];

// --- MicroGreen Patterns ---

const MICROGREEN_PATTERNS: PredefinedPattern[] = [
    {
        name: "Red to Blue Transition",
        description: "Promotes initial stem elongation then shifts to compact, leafy growth.",
        keyframes: (gridSize: number) => [
            { time: 360, name: "Morning Red", grid: fullGrid(gridSize, { r: 255, g: 50, b: 50, active: true }) },
            { time: 720, name: "Midday Balanced", grid: fullGrid(gridSize, { r: 150, g: 100, b: 150, active: true }) },
            { time: 1080, name: "Evening Blue", grid: fullGrid(gridSize, { r: 50, g: 50, b: 255, active: true }) },
            { time: 1200, name: "Night", grid: nightGrid(gridSize) }
        ]
    },
    {
        name: "High-Intensity Pulse",
        description: "Experimental high-frequency pulsing to potentially boost growth.",
        keyframes: (gridSize: number) => [
            { time: 360, name: "Pulse On", grid: fullGrid(gridSize, { r: 255, g: 255, b: 255, active: true }) },
            { time: 370, name: "Pulse Off", grid: fullGrid(gridSize, { r: 50, g: 0, b: 0, active: true }) },
            { time: 420, name: "Pulse On", grid: fullGrid(gridSize, { r: 255, g: 255, b: 255, active: true }) },
            { time: 430, name: "Pulse Off", grid: fullGrid(gridSize, { r: 50, g: 0, b: 0, active: true }) },
            { time: 480, name: "Pulse On", grid: fullGrid(gridSize, { r: 255, g: 255, b: 255, active: true }) },
            { time: 490, name: "Pulse Off", grid: fullGrid(gridSize, { r: 50, g: 0, b: 0, active: true }) },
            { time: 960, name: "Pulse On", grid: fullGrid(gridSize, { r: 255, g: 255, b: 255, active: true }) },
            { time: 970, name: "Pulse Off", grid: fullGrid(gridSize, { r: 50, g: 0, b: 0, active: true }) },
            { time: 1020, name: "Pulse On", grid: fullGrid(gridSize, { r: 255, g: 255, b: 255, active: true }) },
            { time: 1030, name: "Pulse Off", grid: fullGrid(gridSize, { r: 50, g: 0, b: 0, active: true }) },
            { time: 1140, name: "Lights Off", grid: nightGrid(gridSize) }
        ]
    },
    {
        name: "Finishing Spectrum (Blue Heavy)",
        description: "A blue-dominant cycle for final days to enhance color and nutrients.",
        keyframes: (gridSize: number) => [
            { time: 360, name: "Morning Blue", grid: fullGrid(gridSize, { r: 100, g: 100, b: 255, active: true }) },
            { time: 720, name: "Midday Intense Blue", grid: fullGrid(gridSize, { r: 150, g: 150, b: 255, active: true }) },
            { time: 1080, name: "Evening Blue", grid: fullGrid(gridSize, { r: 80, g: 80, b: 200, active: true }) },
            { time: 1200, name: "Night", grid: nightGrid(gridSize) }
        ]
    },
    {
        name: "Continuous Red",
        description: "Constant red light during the day for stem elongation.",
        keyframes: (gridSize: number) => [
            { time: 360, name: "Red On", grid: fullGrid(gridSize, { r: 255, g: 0, b: 0, active: true }) },
            { time: 1200, name: "Night", grid: nightGrid(gridSize) }
        ]
    },
    {
        name: "Red w/ Slow Blue Pulses",
        description: "Base red light with slow, high-intensity blue pulses.",
        keyframes: (gridSize: number) => [
            { time: 360, name: "Red Base", grid: fullGrid(gridSize, { r: 200, g: 0, b: 0, active: true }) },
            { time: 480, name: "Blue Pulse On", grid: fullGrid(gridSize, { r: 200, g: 0, b: 255, active: true }) },
            { time: 490, name: "Blue Pulse Off", grid: fullGrid(gridSize, { r: 200, g: 0, b: 0, active: true }) },
            { time: 600, name: "Blue Pulse On", grid: fullGrid(gridSize, { r: 200, g: 0, b: 255, active: true }) },
            { time: 610, name: "Blue Pulse Off", grid: fullGrid(gridSize, { r: 200, g: 0, b: 0, active: true }) },
            { time: 840, name: "Blue Pulse On", grid: fullGrid(gridSize, { r: 200, g: 0, b: 255, active: true }) },
            { time: 850, name: "Blue Pulse Off", grid: fullGrid(gridSize, { r: 200, g: 0, b: 0, active: true }) },
            { time: 960, name: "Blue Pulse On", grid: fullGrid(gridSize, { r: 200, g: 0, b: 255, active: true }) },
            { time: 970, name: "Blue Pulse Off", grid: fullGrid(gridSize, { r: 200, g: 0, b: 0, active: true }) },
            { time: 1200, name: "Night", grid: nightGrid(gridSize) }
        ]
    },
    {
        name: "Red w/ Fast Blue Pulses",
        description: "Base red light with rapid, medium-intensity blue pulses.",
        keyframes: (gridSize: number) => {
            const kfs: any[] = [{ time: 360, name: "Red Base", grid: fullGrid(gridSize, { r: 150, g: 0, b: 0, active: true }) }];
            for (let i = 400; i < 1180; i += 20) {
                kfs.push({ time: i, name: `Pulse On ${i}`, grid: fullGrid(gridSize, { r: 150, g: 0, b: 180, active: true }) });
                kfs.push({ time: i + 5, name: `Pulse Off ${i+5}`, grid: fullGrid(gridSize, { r: 150, g: 0, b: 0, active: true }) });
            }
            kfs.push({ time: 1200, name: "Night", grid: nightGrid(gridSize) });
            return kfs;
        }
    },
    {
        name: "Red w/ Varied Blue Pulses",
        description: "Base red light with a mix of high and low intensity blue pulses.",
        keyframes: (gridSize: number) => [
            { time: 360, name: "Low Red Base", grid: fullGrid(gridSize, { r: 100, g: 0, b: 0, active: true }) },
            { time: 420, name: "Low Pulse On", grid: fullGrid(gridSize, { r: 100, g: 0, b: 100, active: true }) },
            { time: 425, name: "Low Pulse Off", grid: fullGrid(gridSize, { r: 100, g: 0, b: 0, active: true }) },
            { time: 430, name: "Low Pulse On", grid: fullGrid(gridSize, { r: 100, g: 0, b: 100, active: true }) },
            { time: 435, name: "Low Pulse Off", grid: fullGrid(gridSize, { r: 100, g: 0, b: 0, active: true }) },
            { time: 720, name: "High Pulse On", grid: fullGrid(gridSize, { r: 100, g: 0, b: 255, active: true }) },
            { time: 740, name: "High Pulse Off", grid: fullGrid(gridSize, { r: 100, g: 0, b: 0, active: true }) },
            { time: 900, name: "High Pulse On", grid: fullGrid(gridSize, { r: 100, g: 0, b: 255, active: true }) },
            { time: 920, name: "High Pulse Off", grid: fullGrid(gridSize, { r: 100, g: 0, b: 0, active: true }) },
            { time: 1200, name: "Night", grid: nightGrid(gridSize) }
        ]
    }
];

export const PATTERN_CATEGORIES: PatternCategory[] = [
  {
    name: 'Research-Based',
    patterns: PREDEFINED_PATTERNS,
    icon: 'Leaf'
  },
  {
    name: 'Microgreen-Based',
    patterns: MICROGREEN_PATTERNS,
    icon: 'Sprout'
  },
  {
    name: 'Fun-Based',
    patterns: FUN_BASED_PATTERNS,
    icon: 'Sparkles'
  }
];
