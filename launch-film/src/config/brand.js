// Brand + palette. Swap logo files in assets/brand and fonts in assets/fonts; everything
// (3D title, screen UI, overlays) reads from here.
export const BRAND = {
  logos: {
    higgsfield: 'assets/brand/higgsfield-mark.svg', // glyph from higgsfield.ai site header
    claude: 'assets/brand/claude-mark.svg', // official Claude symbol
  },
  fonts: {
    // family name -> files. Replace with the campaign fonts by dropping files in assets/fonts
    // and updating these entries; every text element references the role names below.
    ui: { family: 'Inter', files: { 400: 'Inter-400.ttf', 500: 'Inter-500.ttf', 600: 'Inter-600.ttf', 700: 'Inter-700.ttf' } },
    display: { family: 'Manrope', files: { 500: 'Manrope-500.ttf', 700: 'Manrope-700.ttf', 800: 'Manrope-800.ttf' } },
    wide: { family: 'Space Grotesk', files: { 500: 'SpaceGrotesk-500.ttf', 700: 'SpaceGrotesk-700.ttf' } },
  },
  color: {
    lime: '#CFF851',
    limeDeep: '#9BC22A',
    claude: '#D97757',
    coral: '#D9534A',
    ink: '#141414',
    paper: '#F4F2EE',
    paperWarm: '#EFE9E2',
    desk: '#D9BFAD',
    wall: '#E7D3C4',
    clay: '#C8644B',
    muted: '#8C847C',
    hfBadgeInk: '#163000',
  },
};
