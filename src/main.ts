
import {getBackendUrlFor} from "./util";

import '@/style.css';
import {loadUI} from "./ui.ts";
import {setupScene} from "./scene.ts";
import {storage} from "./storage.ts";

fetch(getBackendUrlFor('/ld58/stats')).then(r => r.json()).then(r => console.log('received', r))

setupScene()
await storage.init()
loadUI()
