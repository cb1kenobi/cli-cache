import chalk from 'chalk';
import semver from 'semver';
import fs from 'fs-extra';
import yaml from 'yaml';
import { DOMParser } from 'xmldom';

console.log(chalk.magenta('Hello, world in magenta!'));
console.log(semver.valid('1.2.3'));
console.log(fs.readJSONSync('./package.json').name);
console.log(yaml.stringify({ foo: 'bar' }).length);
var x = new DOMParser().parseFromString('<foo>bar</foo>', 'text/xml');
console.log(x.documentElement.tagName);

const { sum } = await import('./lib.js');
console.log(sum(1, 2));
