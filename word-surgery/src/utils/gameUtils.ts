// Minimum word length to be considered valid
export const MIN_WORD_LENGTH = 3;

// Divider width when active
export const DIVIDER_ACTIVE_WIDTH = 6;
// Divider width when inactive
export const DIVIDER_INACTIVE_WIDTH = 2;
// Divider height 
export const DIVIDER_HEIGHT = 60;

// For debug purposes
export const DEBUG = true;

// Helper function to check if a region is already covered by a longer word
export const isRegionCovered = (
  start: number,
  end: number,
  regions: { start: number, end: number }[]
): boolean => {
  // A region is only considered "covered" if it is COMPLETELY CONTAINED within another region
  // This means the entire word must be inside another word, not just overlapping
  for (const region of regions) {
    // For a region to be considered "contained":
    // 1. It must start at or after another region's start
    // 2. It must end at or before another region's end
    // 3. It must NOT be exactly the same as the other region
    const isContained = start >= region.start && end <= region.end;
    const isExactMatch = start === region.start && end === region.end;

    if (isContained && !isExactMatch) {
      if (DEBUG) {
        console.log(`Region ${start}-${end} is covered by ${region.start}-${region.end}`);
      }
      return true;
    }
  }
  
  if (DEBUG && regions.length > 0) {
    console.log(`Region ${start}-${end} is NOT covered by any existing region`);
  }
  
  return false;
}; 