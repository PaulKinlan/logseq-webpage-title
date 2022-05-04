module.exports = {
  branches: ["main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
      },
    ],
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    [
      "@semantic-release/npm",
      {
        npmPublish: false,
      },
    ],
    "@semantic-release/git",
    [
      "@semantic-release/exec",
      {
        prepareCmd:
          "zip -qq -r logseq-webpage-title-${nextRelease.version}.zip dist logo.png README.md LICENSE package.json",
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: "logseq-webpage-title-*.zip",
      },
    ],
  ],
};
