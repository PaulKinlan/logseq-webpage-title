/*
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
import "@logseq/libs";
import getUrls from 'get-urls';

function main() {
  logseq.Editor.registerSlashCommand("Title", async () => {
    const text = await logseq.Editor.getEditingBlockContent();
    const {uuid} = await logseq.Editor.getCurrentBlock();
    const {pos} = await logseq.Editor.getEditingCursorPosition();

    // Find the first URL after the command.
    const [before, after] = [text.slice(0, pos), text.slice(pos)];
    const urls = getUrls(after);

    if(urls.size >= 1) {
      // Just get the first URL
      const url = urls.keys().next().value;
      const response = await fetch(url);
      const responseText = await response.text();
      const matches = responseText.match(/<title>([^<]*)<\/title>/);
      if (matches.length > 1) {
        const title = matches[1];
        const newBlockText = before + after.replace(url, `[${title}](${url})`);
        logseq.Editor.updateBlock(uuid, newBlockText);
      }

    }
  });
}

// bootstrap
logseq.ready(main).catch(console.error);
