import chalk from 'chalk';
import semver from 'semver';
import fs from 'fs-extra';
import yaml from 'yaml';
import { DOMParser } from 'xmldom';

console.log(chalk.magenta('Hello, world!'));
console.log(semver.valid('1.2.3'));
console.log(semver.valid('a.b.c'));
console.log(semver.valid('1.2.3-beta.1'));
console.log(semver.valid('1.2.3-beta.1+build.1'));
console.log(semver.valid('1.2.3-beta.1+build.1'));

console.log(fs.readJSONSync('./package.json').version);
console.log(yaml.stringify({ foo: 'bar' }).length);
var x = new DOMParser().parseFromString('<foo>bar</foo>', 'text/xml');
console.log(x.title);

const { sum } = await import('./lib.js');
console.log(sum(1, 2));
