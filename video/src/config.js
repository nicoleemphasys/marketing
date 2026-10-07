// Single source of truth for the Emphasys NAHRO 2026 booth loop:
// format, brand tokens, beats (frames, copy, background, motion).
// Copy markup: *words* are drawn in the accent color (orange).
window.CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
  frames: 1800,

  colors: {
    white: '#FFFFFF',
    deepNavy: '#052E65',
    navy: '#21437C',
    sky: '#43A7F9',
    orange: '#F76B13',
    mute: '#D3DAE5',
  },

  font: { family: 'Poppins', tracking: -0.03 },

  // 2-frame full-color cuts between ideas (frame -> background).
  flashes: {
    148: 'sky', 388: 'orange', 568: 'sky', 748: 'orange',
    928: 'sky', 1108: 'orange', 1288: 'sky', 1468: 'orange',
  },

  // Vessel tag (scenes 3-7): label + index of the current dot.
  vessel: {
    s03: { label: 'Clearer workflows', index: 0 },
    s04: { label: 'Compliance confidence', index: 1 },
    s05: { label: 'Better resident experiences', index: 2 },
    s06: { label: 'Stronger staff support', index: 3 },
    s07: { label: 'More useful insight', index: 4 },
  },

  beats: [
    { id: '1.1', start: 0,    end: 40,   bg: 'paper',  copy: [],                                        motion: 'roofline draw' },
    { id: '1.2', start: 40,   end: 85,   bg: 'paper',  copy: ['Every', 'home'],                         motion: 'roof slides onto house, tiles pop 3f apart, rise & unblur' },
    { id: '1.3', start: 85,   end: 150,  bg: 'paper',  copy: ['starts with', 'someone', '*who did*', '*the work.*'], motion: 'kinetic stack' },
    { id: '2.1', start: 150,  end: 200,  bg: 'paper',  copy: ['Intake.', 'Recerts.'],                   motion: 'word flicker 12f, 100->104%', hold: 12 },
    { id: '2.2', start: 200,  end: 250,  bg: 'sky',    copy: ['Inspections.', 'Waitlists.'],            motion: 'word flicker, sky every second word', hold: 12 },
    { id: '2.3', start: 250,  end: 300,  bg: 'orange', copy: ['Payments.', 'Deadlines.'],               motion: 'word flicker 10f, orange flash', hold: 10 },
    { id: '2.4', start: 300,  end: 345,  bg: 'paper',  copy: ['All before', '*lunch.*'],                motion: 'rise in, sky squiggle draws' },
    { id: '2.5', start: 345,  end: 390,  bg: 'navy',   copy: ['That’s *you.*'],                    motion: 'scale slam 150->96->100 in 8f, ghost, 6px shake' },
    { id: '3.1', start: 390,  end: 450,  bg: 'paper',  copy: ['Less', '*paper.*'],                      motion: 'vessel tag in, sheets pop scattered' },
    { id: '3.2', start: 450,  end: 500,  bg: 'mist',   copy: ['Fewer', '*clicks.*'],                    motion: 'whip cut from left, cursor click, rings' },
    { id: '3.3', start: 500,  end: 570,  bg: 'paper',  copy: ['More time', 'for *people.*'],            motion: 'sheets stack into one card, kinetic stack' },
    { id: '4.1', start: 570,  end: 630,  bg: 'paper',  copy: ['Review', 'next week?'],                  motion: 'calendar pops, badge bounces twice' },
    { id: '4.2', start: 630,  end: 680,  bg: 'sky',    copy: ['Ready.'],                                motion: 'sky flash, scale slam, hold' },
    { id: '4.3', start: 680,  end: 750,  bg: 'paper',  copy: ['Every file.', '*Every deadline.*'],      motion: 'check ripple 2f apart, last still drawing' },
    { id: '5.1', start: 750,  end: 810,  bg: 'mist',   copy: ['Fewer trips', '*downtown.*'],            motion: 'dotted route draws, X stamps' },
    { id: '5.2', start: 810,  end: 860,  bg: 'paper',  copy: ['Done from', 'the kitchen', 'table.'],    motion: 'phone slides up, card pops 105%, rings' },
    { id: '5.3', start: 860,  end: 930,  bg: 'paper',  copy: ['Faster answers', 'for *families.*'],     motion: 'mask wipe 12f per line' },
    { id: '6.1', start: 930,  end: 990,  bg: 'paper',  copy: ['Hard day?'],                             motion: 'navy bubble pops from bottom-left' },
    { id: '6.2', start: 990,  end: 1040, bg: 'paper',  copy: ['Hard day?', 'We pick up.'],              motion: 'bubble shrinks, typing dots 12f, orange reply' },
    { id: '6.3', start: 1040, end: 1110, bg: 'mist',   copy: ['Real people', 'on the *other end.*'],    motion: 'bubbles fly off, rise & unblur' },
    { id: '7.1', start: 1110, end: 1170, bg: 'paper',  copy: ['See it *sooner.*'],                      motion: 'bars grow, orange line draws' },
    { id: '7.2', start: 1170, end: 1220, bg: 'mist',   copy: ['Across', 'every', '*property.*'],        motion: 'dot map ripple' },
    { id: '7.3', start: 1220, end: 1290, bg: 'paper',  copy: ['Act while', 'there’s *time.*'],     motion: 'chart fades to 18%, hold' },
    { id: '8.1', start: 1290, end: 1350, bg: 'paper',  copy: ['Since', '1976'],                         motion: 'slot reel from 1976 upward' },
    { id: '8.2', start: 1350, end: 1400, bg: 'orange', copy: ['2026'],                                  motion: 'lands with bounce + ghost echo' },
    { id: '8.3', start: 1400, end: 1470, bg: 'paper',  copy: ['50 years of', 'showing up for', 'the people who', '*house people.*'], motion: 'kinetic stack 6f apart' },
    { id: '9.1', start: 1470, end: 1560, bg: 'paper',  copy: ['What makes', '*home*', '*possible?*'],   motion: 'house returns with empty slot' },
    { id: '9.2', start: 1560, end: 1650, bg: 'paper',  copy: ['Come add', '*your tile.*', 'Booth #1504'], motion: 'orange tile drops in, booth pill pops' },
    { id: '9.3', start: 1650, end: 1740, bg: 'navy',   copy: ['For the people who *house people.*'],    motion: 'roofline draws over logo, tagline rises' },
    { id: '9.4', start: 1740, end: 1800, bg: 'paper',  copy: [],                                        motion: 'clear to white, roofline un-draws to frame 0' },
  ],
};
