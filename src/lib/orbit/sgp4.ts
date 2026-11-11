// satellite.js, without its WebAssembly build.
//
// The package's entry point also re-exports a threaded WASM propagator. A
// bundler that follows that entry tries to package worker scripts this site
// never runs. Importing the plain JavaScript modules directly keeps the orbit
// chunk to the SGP4 maths and the coordinate transforms.

export { jday } from '../../../node_modules/satellite.js/dist/ext.js';
export { json2satrec } from '../../../node_modules/satellite.js/dist/io.js';
export { gstime, propagate, sgp4 } from '../../../node_modules/satellite.js/dist/propagation.js';
export { sunPos } from '../../../node_modules/satellite.js/dist/sun.js';
export { ecfToLookAngles, eciToEcf, eciToGeodetic } from '../../../node_modules/satellite.js/dist/transforms.js';
export type { SatRec } from 'satellite.js';
