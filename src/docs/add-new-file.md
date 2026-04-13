# Add a new file to ambient snippets

This project uses `snippets/ambient/files.json` to list files on the ambient explorer page.

## Steps

1. Put your new file in `snippets/ambient/`.

Example:

- `snippets/ambient/my-new-track.mp3`

2. Open `snippets/ambient/files.json`.
3. Add the new filename to the JSON array.

Example:

```json
[
  "snippets.mp3",
  "my-new-track.mp3"
]
```

4. Save and refresh `snippets/ambient/index.html` in your browser.

## Notes

- Only add the filename, not a full path.
- Keep valid JSON syntax:
  - Use double quotes.
  - Separate items with commas.
  - Do not leave a trailing comma after the last item.
- You can reorder items in `files.json`; the page sorts names alphabetically before display.
