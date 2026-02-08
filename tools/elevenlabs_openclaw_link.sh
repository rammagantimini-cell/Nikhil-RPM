#!/usr/bin/env bash
set -euo pipefail

# Links ElevenLabs Conversational AI agent to OpenClaw Chat Completions via ngrok.
# Requires:
#   - ELEVENLABS_API_KEY in env
#   - openclaw config at ~/.openclaw/openclaw.json with gateway.auth.token
# Usage:
#   ./tools/elevenlabs_openclaw_link.sh https://YOUR_NGROK_DOMAIN
# Outputs:
#   - secret_id for the stored OpenClaw gateway token
#   - (optionally) creates a new agent and prints its agent_id

NGROK_BASE_URL="${1:?Pass your ngrok base url, e.g. https://xxxxx.ngrok-free.dev}"

if [[ -z "${ELEVENLABS_API_KEY:-}" ]]; then
  echo "ERROR: ELEVENLABS_API_KEY is not set in the environment." >&2
  exit 1
fi

OPENCLAW_CFG="$HOME/.openclaw/openclaw.json"
if [[ ! -f "$OPENCLAW_CFG" ]]; then
  echo "ERROR: Can't find $OPENCLAW_CFG" >&2
  exit 1
fi

# Extract gateway token without printing it
GATEWAY_TOKEN=$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.env.HOME+"/.openclaw/openclaw.json","utf8"));process.stdout.write(j.gateway?.auth?.token||"")')
if [[ -z "$GATEWAY_TOKEN" ]]; then
  echo "ERROR: gateway.auth.token not found in $OPENCLAW_CFG" >&2
  exit 1
fi

CHAT_URL="$NGROK_BASE_URL/v1/chat/completions"

# 1) Create secret for OpenClaw gateway token
PAYLOAD=$(node -e 'console.log(JSON.stringify({type:"new",name:"openclaw_gateway_token",value:process.argv[1]}))' "$GATEWAY_TOKEN")

HTTP_AND_BODY=$(curl -sS -X POST "https://api.elevenlabs.io/v1/convai/secrets" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -w "\n__HTTP_STATUS__=%{http_code}\n")

SECRET_JSON=$(echo "$HTTP_AND_BODY" | sed -n '1,/__HTTP_STATUS__/p' | sed '$d')
HTTP_STATUS=$(echo "$HTTP_AND_BODY" | sed -n 's/__HTTP_STATUS__=//p' | tail -n1)

# Basic HTTP check
if [[ "$HTTP_STATUS" != "200" && "$HTTP_STATUS" != "201" ]]; then
  echo "ERROR: ElevenLabs secrets API failed (HTTP $HTTP_STATUS). Response:" >&2
  echo "$SECRET_JSON" >&2
  echo "\nTroubleshooting:" >&2
  echo "- Verify ELEVENLABS_API_KEY is correct and has ConvAI access" >&2
  echo "- Check your ElevenLabs account / plan supports ConvAI + calling" >&2
  exit 1
fi

SECRET_ID=$(node - <<'NODE'
const fs = require('fs');
let s = '';
process.stdin.on('data', d => s += d);
process.stdin.on('end', () => {
  try {
    const j = JSON.parse(s);
    const id = j.secret_id || j.secretId || (j.type === 'stored' ? j.secret_id : undefined);
    if (!id) process.exit(2);
    process.stdout.write(String(id));
  } catch (e) {
    process.exit(2);
  }
});
NODE
<<< "$SECRET_JSON" 2>/dev/null || true)

if [[ -z "$SECRET_ID" ]]; then
  echo "ERROR: Could not parse secret_id from response (but HTTP was $HTTP_STATUS). Response:" >&2
  echo "$SECRET_JSON" >&2
  exit 1
fi

echo "OK secret_id=$SECRET_ID"

echo "Next: In ElevenLabs agent settings, set Custom LLM URL to: $CHAT_URL"
echo "and set Custom LLM API key to use secret_id=$SECRET_ID"

# Optional: create a fresh agent pre-configured for OpenClaw.
# Uncomment if you want to create from scratch.
#
# AGENT_JSON=$(curl -sS -X POST "https://api.elevenlabs.io/v1/convai/agents/create" \
#   -H "xi-api-key: $ELEVENLABS_API_KEY" \
#   -H "Content-Type: application/json" \
#   -d "{\"conversation_config\":{\"agent\":{\"language\":\"en\",\"prompt\":{\"llm\":\"custom-llm\",\"prompt\":\"You are Nova, a helpful assistant.\",\"custom_llm\":{\"url\":\"$CHAT_URL\",\"api_key\":{\"secret_id\":\"$SECRET_ID\"}}}}}}}")
#
# echo "$AGENT_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{const j=JSON.parse(s);console.log("agent_id="+(j.agent_id||j.id||""));}catch(e){console.error(s);process.exit(1)}})'
