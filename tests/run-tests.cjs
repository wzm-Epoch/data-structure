// Pass explicit file names so Windows shells do not need wildcard expansion.
const { readdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const files = readdirSync(__dirname).filter(name => name.endsWith('.test.cjs')).sort().map(name => path.join(__dirname,name));
const result = spawnSync(process.execPath,['--test',...files],{stdio:'inherit'});
if(result.error) console.error(result.error.message);
process.exitCode=result.status ?? 1;
