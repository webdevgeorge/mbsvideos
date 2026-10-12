import { loadFont as loadSerif } from '@remotion/google-fonts/PlayfairDisplay';
import { loadFont as loadSans } from '@remotion/google-fonts/Inter';

export const serif = loadSerif('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily;
export const sans = loadSans('normal', { weights: ['400', '600', '700'], subsets: ['latin'] }).fontFamily;
import { loadFont as loadRound } from '@remotion/google-fonts/Fredoka';

/** Friendly rounded face for the character style. */
export const round = loadRound('normal', { weights: ['500', '600', '700'], subsets: ['latin'] }).fontFamily;
