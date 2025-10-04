
import {getBackendUrlFor} from "./util";

import '@/style.css';
import {loadUI} from "./ui.ts";
import {setupScene} from "./scene.ts";

fetch(getBackendUrlFor('/ld58/stats')).then(r => r.json()).then(r => console.log('received', r))

setupScene()
loadUI()

