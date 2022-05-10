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
import urlRegex from "url-regex";

async function getTitle(url) {
  let title = "";

  const response = await fetch(url);
  const responseText = await response.text();
  const matches = responseText.match(/<title>([^<]*)<\/title>/);
  if (matches !== null && matches.length > 1) {
    title = matches[1].trim();
  }
  return title;
}

function main() {
  logseq.Editor.registerBlockContextMenuItem(
    "Get Link Titles",
    async ({ uuid,blockId }) => {
      const {content} = await logseq.Editor.getBlock(uuid);
      let text = content;

      // Get's all the urls.
      const urls = text.match(urlRegex());
      let offset = 0;

      for (const url of urls) {
        const urlIndex = text.indexOf(url, offset);
        if (
          text.slice(urlIndex - 2, urlIndex) != "](" ||
          text.slice(urlIndex + url.length, urlIndex + url.length + 1) != ")"
        ) {
          // It's a URL that's not wrapped
          const title = await getTitle(url);
          if (title != "") {
            const start = text.slice(0, urlIndex);
            const linkifiedUrl = `[${title}](${url})`;
            const end = text.slice(urlIndex + url.length);
            text = `${start}${linkifiedUrl}${end}`;
            offset = urlIndex + url.length;
          }
        }
      }

      await logseq.Editor.updateBlock(uuid, text);
    }
  );

  logseq.Editor.registerSlashCommand("Title", async ({ uuid }) => {
    const text = await logseq.Editor.getEditingBlockContent();
    const { pos } = await logseq.Editor.getEditingCursorPosition();

    // Find the first URL after the command.
    const [before, after] = [text.slice(0, pos), text.slice(pos)];
    const urls = after.match(urlRegex());

    if (urls.length >= 1) {
      // Just get the first URL
      const url = urls[0];
      const title = await getTitle(url);
      if (title != "") {
        const newBlockText = before + after.replace(url, `[${title}](${url})`);
        await logseq.Editor.updateBlock(uuid, newBlockText);
      }
    }
  });
}

// bootstrap
logseq.ready(main).catch(console.error);
