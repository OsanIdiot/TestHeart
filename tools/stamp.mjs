// 배포 전에 실행: node tools/stamp.mjs
// src/*.js 파일마다 내용으로 만든 버전 번호(?v=...)를 index.html에 적어 둔다.
// 파일이 바뀌면 주소가 바뀌므로, 폰 브라우저가 예전 파일을 캐시에서 섞어 쓰지 못한다.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'src');
const html = join(root, 'index.html');

const files = readdirSync(src).filter((f) => f.endsWith('.js')).sort();
const version = (f) => createHash('sha1').update(readFileSync(join(src, f))).digest('hex').slice(0, 8);
const imports = Object.fromEntries(files.map((f) => [`./src/${f}`, `./src/${f}?v=${version(f)}`]));

const block = [
  '<!-- version:start (node tools/stamp.mjs 가 자동으로 씀) -->',
  `<script type="importmap">${JSON.stringify({ imports }, null, 2)}</script>`,
  `<script type="module" src="${imports['./src/main.js']}"></script>`,
  '<!-- version:end -->',
].join('\n');

let page = readFileSync(html, 'utf8');
if (page.includes('<!-- version:start')) {
  page = page.replace(/<!-- version:start[\s\S]*?<!-- version:end -->/, block);
} else {
  page = page.replace('<script type="module" src="src/main.js"></script>', block);
}
writeFileSync(html, page);
console.log(`버전 표시 완료: ${files.length}개 파일`);
