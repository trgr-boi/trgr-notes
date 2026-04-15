#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <target-directory>" >&2
  exit 1
fi

target_dir="$1"

if [[ ! -d "$target_dir" ]]; then
  echo "Error: target directory not found: $target_dir" >&2
  exit 1
fi

target_dir="$(cd "$target_dir" && pwd)"
media_dir="$target_dir/media"
output_file="$target_dir/files.json"

if [[ ! -d "$media_dir" ]]; then
  echo "Error: media directory not found: $media_dir" >&2
  exit 1
fi

json_escape() {
  local s="$1"
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\t'/\\t}
  s=${s//$'\r'/\\r}
  s=${s//$'\n'/\\n}
  printf '%s' "$s"
}

json_basename() {
  local s="$1"
  s="${s##*/}"
  s="${s%.*}"
  printf '%s' "$s"
}

files=()
while IFS= read -r file; do
  files+=("$file")
done < <(find "$media_dir" -type f | LC_ALL=C sort)

{
  echo "["
  for i in "${!files[@]}"; do
    rel_path="${files[$i]#"$target_dir"/}"
    escaped_file="$(json_escape "$rel_path")"
    escaped_title="$(json_escape "$(json_basename "$rel_path")")"

    if [[ $i -lt $((${#files[@]} - 1)) ]]; then
      printf '  {"file": "%s", "title": "%s", "comment": ""},\n' "$escaped_file" "$escaped_title"
    else
      printf '  {"file": "%s", "title": "%s", "comment": ""}\n' "$escaped_file" "$escaped_title"
    fi
  done
  echo "]"
} > "$output_file"

echo "Wrote $output_file with ${#files[@]} entr$( [[ ${#files[@]} -eq 1 ]] && echo y || echo ies )."