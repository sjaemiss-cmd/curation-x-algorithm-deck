import * as x from './engine.mjs?v=ko1';
import * as twitter from './twitter-engine.mjs?v=ko1';
export const ERA=new URLSearchParams(location.search).get('year')==='2023'?'2023':'2026';
const active=ERA==='2023'?twitter:x;
export const {HEADS,NEG,CONT,DEFAULT_OPTIONS,validateWeights,rank,simulate}=active;
export const DEFAULTS_PATH=ERA==='2023'?'data/twitter-2023-defaults.json':'data/source-defaults.json';
