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

function decodeHTML(input) {
  if (input == undefined || input === "") {
    return "";
  }
  const doc = new DOMParser().parseFromString(input, "text/html");
  return doc.documentElement.textContent;
}

async function getTitle(url) {
  let title = "";

  const response = await fetch(url);
  const responseText = await response.text();
  const matches = responseText.match(/<title(\s[^>]+)*>([^<]*)<\/title>/);
  if (matches !== null && matches.length > 1) {
    if (matches[2] != null) {
      title = decodeHTML(matches[2].trim());
    }
  }

  if (title === "") {
    logseq.UI.showMsg(`No title found for ${url}`);
  }

  return title;
}

async function replaceTitle(url, text, urlIndex, offset) {
  const title = await getTitle(url);
  if (title != "") {
    const { preferredFormat } = await logseq.App.getUserConfigs();
    const start = text.slice(0, urlIndex);
    let linkifiedUrl = url; // If there is a new configuration option that we can't handle then just keep the URL.
    if (preferredFormat === "markdown") {
      linkifiedUrl = `[${title}](${url})`;
    } else if (preferredFormat === "org") {
      linkifiedUrl = `[[${url}][${title}]]`;
    }
    const end = text.slice(urlIndex + url.length);
    text = `${start}${linkifiedUrl}${end}`;
    offset = urlIndex + url.length;
  }
  return { text, offset };
}

const replaceAllTitle = async ({ uuid }) => {
  const { content } = await logseq.Editor.getBlock(uuid);

  let text = content;

  // Get's all the urls
  const urls = text.slice(0).match(urlRegex());
  let offset = 0;

  // Find all the URL's in the text, then find the first non-markdown and convert. Then finish.

  for (const url of urls) {
    const urlIndex = text.indexOf(url, offset);
    if (
      text.slice(urlIndex - 2, urlIndex) != "](" ||
      text.slice(urlIndex + url.length, urlIndex + url.length + 1) != ")"
    ) {
      // It's a URL that's not wrapped
      ({ text, offset } = await replaceTitle(url, text, urlIndex, offset));
      await logseq.Editor.updateBlock(uuid, text);
      return;
    }
    // move down the rest of the string.
    offset = urlIndex + url.length;
  }
};

const replaceTitleAfterCommand = async ({ uuid }) => {
  const { content } = await logseq.Editor.getBlock(uuid);
  const { pos } = await logseq.Editor.getEditingCursorPosition();

  let text = content;

  // Get's all the urls.
  const urls = text.slice(pos).match(urlRegex());
  let offset = 0;

  // Find all the URL's in the text, then find the first non-markdown and convert. Then finish.

  for (const url of urls) {
    const urlIndex = text.indexOf(url, offset);
    if (
      text.slice(urlIndex - 2, urlIndex) != "](" ||
      text.slice(urlIndex + url.length, urlIndex + url.length + 1) != ")"
    ) {
      // It's a URL that's not wrapped
      ({ text, offset } = await replaceTitle(url, text, urlIndex, offset));
      await logseq.Editor.updateBlock(uuid, text);
      return;
    }
    // move down the rest of the string.
    offset = urlIndex + url.length;
  }
};

const replaceTitleBeforeCommand = async ({ uuid }) => {
  // ISSUE - sometimes if you are really quick the block won't be committed yet.
  const { content } = await logseq.Editor.getBlock(uuid);
  const { pos } = await logseq.Editor.getEditingCursorPosition();

  let text = content;

  // Get's all the urls.
  const urls = text.slice(0, pos).match(urlRegex());
  urls.reverse();

  let offset = 0;

  // Find all the URL's in the text, then find the last non-markdown and convert. Then finish.

  for (let url of urls) {
    // HACK
    url = url.replace(/\)$/, "");
    const urlIndex = text.lastIndexOf(url);
    if (
      text.slice(urlIndex - 2, urlIndex) != "](" ||
      text.slice(urlIndex + url.length, urlIndex + url.length + 1) != ")"
    ) {
      // It's a URL that's not wrapped.
      ({ text, offset } = await replaceTitle(url, text, urlIndex, offset));
      await logseq.Editor.updateBlock(uuid, text);
      return;
    }
  }
};

function callSettings() {
  // Get settings from useSettingsSchema.
  const settings = [{
          key: "registerCommand",
          type: "boolean",
          default: true,
          title: "Use shortcut",
          description: "Whether or not to register in the command panel with shortcut",
      },
      {
          key: "ReplaceAllTitle",
          title: "Replace all titles",
          description: "The keyboard shortcut at replace all titles in current block. (default: mod+t - Mac: cmd+t | Windows: ctrl+t)",
          type: "string",
          default: "mod+t"
      },
      
      {
          key: "ReplaceTitleAfter",
          title: "Replace the title after",
          description: "The keyboard shortcut at replace the first title after cursor. (default: null)",
          type: "string",
          default: null
      },
      {
          key: "ReplaceTitleBefore",
          title: "Replace the title before",
          description: "The keyboard shortcut at replace the first title before cursor. (default: null)",
          type: "string",
          default: null
      }
  ]
  logseq.useSettingsSchema(settings);
}


function registerKeyboardShortcuts() {
  // register in command panel with shortcut.
  if (logseq.settings.ReplaceAllTitle != null && logseq.settings.ReplaceAllTitle != "") {
      logseq.App.registerCommandPalette({
          key: "Title",
          label: "Logseq-webpage-title: Replace all titles",
          keybinding: {
              binding: logseq.settings.ReplaceAllTitle,
              mode: "global",
          }
      }, replaceAllTitle);
  }
  if (logseq.settings.ReplaceTitleAfter != null && logseq.settings.ReplaceTitleAfter != "") {
      logseq.App.registerCommandPalette({
          key: "Title After Cursor",
          label: "Logseq-webpage-title: Replace the title after",
          keybinding: {
              binding: logseq.settings.ReplaceTitleAfter,
              mode: "global",
          }
      }, replaceTitleAfterCommand);
  }
  if (logseq.settings.ReplaceTitleBefore != null && logseq.settings.ReplaceTitleBefore != "") {
      logseq.App.registerCommandPalette({
          key: "Title Before Cursor",
          label: "Logseq-webpage-title: Replace the title before",
          keybinding: {
              binding: logseq.settings.ReplaceTitleBefore,
              mode: "global",
          }
      }, replaceTitleBeforeCommand);
  }
}

function main() {
  logseq.Editor.registerBlockContextMenuItem(
    "Get Link Titles",
    async ({ uuid }) => {
      const { content } = await logseq.Editor.getBlock(uuid);
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
          ({ text, offset } = await replaceTitle(url, text, urlIndex, offset));
        }
      }

      await logseq.Editor.updateBlock(uuid, text);
    }
  );

  logseq.Editor.registerSlashCommand("Title", replaceAllTitle);
  logseq.Editor.registerSlashCommand(
    "Title After Cursor",
    replaceTitleAfterCommand
  );

  logseq.Editor.registerSlashCommand(
    "Title Before Cursor",
    replaceTitleBeforeCommand
  );

  callSettings();
  console.log(logseq.settings);
  if (logseq.settings.registerCommand) {
    registerKeyboardShortcuts();
  }
}

// bootstrap
logseq.ready(main).catch(console.error);
