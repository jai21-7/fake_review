# Linewise

Phone reputation docs for GitHub Pages. Paste or pick a number, read a spam-risk score from 0 to 100, and see the JSON a client would parse. The preview runs in the browser. Nothing is uploaded.

There is no live lookup service in this repository. `https://api.example.com` in the code samples is a placeholder for the request shape.

## Run it

GitHub Pages serves the repository root. Locally:

```bash
python3 -m http.server 8765
```

Open `http://localhost:8765`.

```bash
node --test tests/preview.test.mjs
```

## What each file does

| File | Job |
| --- | --- |
| `index.html` | The page: sandbox, schema, snippets, pricing, privacy |
| `css/styles.css` | Layout and type |
| `js/preview.js` | Turns a number into the JSON body. No network |
| `js/page.js` | Reads the form and writes the preview |
| `tests/preview.test.mjs` | Checks sample scores, the null score for unknown numbers, and the 429 example |

## How a preview is chosen

1. The box reads the number and strips spaces, dashes, dots, and parentheses.
2. Ten digits are treated as a US number and given a leading `+1`. A value that already starts with `+` is checked as E.164: 8 to 15 digits, no letters.
3. If the result is one of the four published samples, the response includes `reputation.risk_score`. Those scores are constants in `js/preview.js`, so the same sample always returns the same score.
4. Any other valid number returns `risk_score: null`. A North American toll-free or premium prefix still sets `line.type`, because that comes from the numbering plan, not from a complaint database.
5. Invalid input returns HTTP 400 and `error.code = invalid_number`.

`live_lookup` is always `false` on this site.

## Samples

| Number | Score | Level | Recommendation |
| --- | --- | --- | --- |
| `+12025550147` | 8 | low | allow |
| `+18005550199` | 47 | medium | challenge |
| `+19005550199` | 92 | high | block |
| `+447700900123` | 71 | high | block |

`555` numbers and the UK `7700` drama range are reserved for examples.

## Free tier, as documented

100 requests per UTC day, 2 requests per second, then HTTP 429 with `Retry-After` and `X-RateLimit-*`. The in-page sandbox is not counted. Details are in the Pricing section.

## Privacy boundary

Responses do not include a person's name, address, or location. The page script does not send the number anywhere. Do not treat a sample score as a fact about a real subscriber.
