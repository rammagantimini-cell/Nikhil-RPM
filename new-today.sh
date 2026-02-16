#!/bin/bash
# new-today.sh — Quick wrapper to generate today's RPM lesson
# Usage: ./new-today.sh ["Topic Name"]
# If no topic provided, rotates through the topic library automatically

cd "$(dirname "$0")" || exit 1

TODAY=$(date +%Y-%m-%d)
TOPIC="${1:-}"

echo "📝 Generating RPM lesson for $TODAY..."

if [ -n "$TOPIC" ]; then
    node tools/generate_lesson.js --topic "$TOPIC" --date "$TODAY"
else
    node tools/generate_lesson.js --date "$TODAY"
fi

# Show result
FOLDER="$TODAY"
if [ -f "$FOLDER/lesson.html" ]; then
    echo "✅ Created: $FOLDER/lesson.html"
    echo "🌐 Local preview: file://$(pwd)/$FOLDER/lesson.html"
else
    echo "❌ Something went wrong — check output above"
fi
