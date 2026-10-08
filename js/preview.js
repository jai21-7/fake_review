/*
  Sandbox preview
  ---------------
  This module builds the JSON a visitor sees after typing a phone number.
  It does not contact a server and it does not look up a real subscriber.

  Two kinds of answers:

  1. Published samples. A few fictional numbers (555 and the UK drama
     range) return a full reputation object so the page can demonstrate
     risk_score, line type, and the other response fields.

  2. Everything else. The page checks the format and, for North American
     numbers, the public numbering plan (toll-free, premium). Reputation
     stays null. A formatting rule is not evidence that a person is a
     spammer.

  The same function is what the tests import. The page only displays it.
*/

export const API_BASE = "https://api.example.com/v1";

export const SAMPLES = [
  {
    e164: "+12025550147",
    region: "US",
    riskScore: 8,
    riskLevel: "low",
    recommendation: "allow",
    labels: ["transactional"],
    lineType: "mobile",
    carrierName: "Sample Wireless",
    ported: false,
    reportCount30d: 0,
    lastReportAt: null,
    firstSeenAt: "2026-02-11T15:04:00Z",
    reputationAsOf: "2026-10-07T06:00:00Z",
    summary: "Fictional mobile number with a quiet sample history."
  },
  {
    e164: "+18005550199",
    region: "US",
    riskScore: 47,
    riskLevel: "medium",
    recommendation: "challenge",
    labels: ["toll-free", "sales-call"],
    lineType: "toll_free",
    carrierName: "Sample Toll-Free",
    ported: false,
    reportCount30d: 14,
    lastReportAt: "2026-10-06T18:22:00Z",
    firstSeenAt: "2025-11-02T12:00:00Z",
    reputationAsOf: "2026-10-07T06:00:00Z",
    summary: "Fictional toll-free number. Medium score means “check”, not “block”."
  },
  {
    e164: "+19005550199",
    region: "US",
    riskScore: 92,
    riskLevel: "high",
    recommendation: "block",
    labels: ["premium-rate", "high-report-volume"],
    lineType: "premium",
    carrierName: "Sample Premium Routing",
    ported: true,
    reportCount30d: 86,
    lastReportAt: "2026-10-07T11:05:00Z",
    firstSeenAt: "2024-08-19T09:30:00Z",
    reputationAsOf: "2026-10-07T06:00:00Z",
    summary: "Fictional premium-rate number used to show a block recommendation."
  },
  {
    e164: "+447700900123",
    region: "GB",
    riskScore: 71,
    riskLevel: "high",
    recommendation: "block",
    labels: ["voip", "spoof-pattern"],
    lineType: "voip",
    carrierName: "Sample VoIP",
    ported: true,
    reportCount30d: 33,
    lastReportAt: "2026-10-05T08:41:00Z",
    firstSeenAt: "2026-01-09T16:12:00Z",
    reputationAsOf: "2026-10-07T06:00:00Z",
    summary: "UK drama-range number reserved for examples, not a real subscriber."
  }
];

const TOLL_FREE_AREA = ["800", "833", "844", "855", "866", "877", "888"];

export function previewNumber(raw, options = {}) {
  const checkedAt = options.now || new Date().toISOString();
  const parsed = parsePhone(raw);

  if (!parsed.ok) {
    return {
      ok: false,
      status: 400,
      body: {
        error: {
          code: "invalid_number",
          message: parsed.message,
          param: "number",
          docs: "#request"
        }
      }
    };
  }

  const sample = SAMPLES.find(function (item) {
    return item.e164 === parsed.e164;
  });

  if (sample) {
    return {
      ok: true,
      status: 200,
      sampleId: sample.e164,
      summary: sample.summary,
      body: envelope(parsed, raw, checkedAt, {
        matchedSample: true,
        reputation: {
          risk_score: sample.riskScore,
          risk_level: sample.riskLevel,
          recommendation: sample.recommendation,
          confidence: "sample",
          labels: sample.labels.slice()
        },
        line: {
          type: sample.lineType,
          carrier_name: sample.carrierName,
          ported: sample.ported
        },
        activity: {
          report_count_30d: sample.reportCount30d,
          last_report_at: sample.lastReportAt,
          first_seen_at: sample.firstSeenAt
        },
        freshness: {
          reputation_as_of: sample.reputationAsOf,
          max_age_hours: 24,
          source: "published sandbox sample"
        }
      })
    };
  }

  const plan = numberingPlan(parsed);
  return {
    ok: true,
    status: 200,
    sampleId: null,
    summary: plan.summary,
    body: envelope(parsed, raw, checkedAt, {
      matchedSample: false,
      reputation: {
        risk_score: null,
        risk_level: "unknown",
        recommendation: "no_reputation_in_sandbox",
        confidence: "none",
        labels: plan.labels
      },
      line: {
        type: plan.lineType,
        carrier_name: null,
        ported: null
      },
      activity: {
        report_count_30d: null,
        last_report_at: null,
        first_seen_at: null
      },
      freshness: {
        reputation_as_of: null,
        max_age_hours: 24,
        source: plan.source
      }
    })
  };
}

export function rateLimitExample() {
  return {
    status: 429,
    headers: {
      "Retry-After": "36",
      "X-RateLimit-Limit": "100",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": "1760000000"
    },
    body: {
      error: {
        code: "rate_limited",
        message: "Free tier allows 100 requests per day. The limit resets at 00:00 UTC.",
        limit: 100,
        remaining: 0,
        retry_after_seconds: 36
      }
    }
  };
}

function envelope(parsed, raw, checkedAt, fields) {
  return {
    request_id: "req_sandbox_" + parsed.nationalNumber.slice(-6),
    mode: "sandbox",
    live_lookup: false,
    checked_at: checkedAt,
    number: {
      input: String(raw == null ? "" : raw).trim(),
      e164: parsed.e164,
      country_calling_code: parsed.countryCallingCode,
      national_number: parsed.nationalNumber,
      region: parsed.region,
      valid_format: true
    },
    reputation: fields.reputation,
    line: fields.line,
    activity: fields.activity,
    freshness: fields.freshness,
    sandbox: {
      matched_sample: fields.matchedSample,
      note: fields.matchedSample
        ? "Scores on sample numbers are fixed examples published in js/preview.js."
        : "This number is not in the sample list. Format checks ran in the browser. No carrier or complaint database was queried."
    }
  };
}

function numberingPlan(parsed) {
  if (parsed.countryCallingCode === "1" && parsed.nationalNumber.length === 10) {
    const area = parsed.nationalNumber.slice(0, 3);
    if (TOLL_FREE_AREA.indexOf(area) !== -1) {
      return {
        lineType: "toll_free",
        labels: ["toll-free"],
        source: "numbering plan only",
        summary: "The 1-" + area + " prefix is toll-free in the North American plan. This sandbox still has no reputation score for it."
      };
    }
    if (area === "900" || area === "976") {
      return {
        lineType: "premium",
        labels: ["premium-rate"],
        source: "numbering plan only",
        summary: "The 1-" + area + " prefix is premium-rate. That describes the number class, not a person. Reputation stays empty off the sample list."
      };
    }
  }

  return {
    lineType: "unknown",
    labels: [],
    source: "format check only",
    summary: "The number is shaped like E.164, and it is not one of the published samples. Risk score is left null on purpose."
  };
}

export function parsePhone(raw) {
  const original = String(raw == null ? "" : raw).trim();
  if (!original) {
    return { ok: false, message: "Enter a phone number. Sample numbers are on the chips below the box." };
  }

  let compact = original.replace(/[().\-\s]/g, "");
  if (compact.indexOf("00") === 0) compact = "+" + compact.slice(2);
  if (/^\d{10}$/.test(compact)) compact = "+1" + compact;
  if (/^1\d{10}$/.test(compact)) compact = "+" + compact;

  if (compact.indexOf("+") !== 0 || !/^\+[1-9]\d{7,14}$/.test(compact)) {
    return {
      ok: false,
      message: "Use an international number, for example +1 202 555 0147. After the +, expect 8 to 15 digits and no letters."
    };
  }

  const digits = compact.slice(1);
  const countryCallingCode = countryCodeOf(digits);
  const nationalNumber = digits.slice(countryCallingCode.length);

  return {
    ok: true,
    e164: "+" + digits,
    countryCallingCode: countryCallingCode,
    nationalNumber: nationalNumber,
    region: regionFor(countryCallingCode)
  };
}

function countryCodeOf(digits) {
  const one = digits.slice(0, 1);
  const two = digits.slice(0, 2);
  const three = digits.slice(0, 3);
  if (one === "1" || one === "7") return one;
  const threeDigit = {
    "211": 1, "212": 1, "213": 1, "216": 1, "218": 1, "220": 1, "221": 1,
    "222": 1, "223": 1, "224": 1, "225": 1, "226": 1, "227": 1, "228": 1,
    "229": 1, "230": 1, "231": 1, "232": 1, "233": 1, "234": 1, "235": 1,
    "236": 1, "237": 1, "238": 1, "239": 1, "240": 1, "241": 1, "242": 1,
    "243": 1, "244": 1, "245": 1, "246": 1, "247": 1, "248": 1, "249": 1,
    "250": 1, "251": 1, "252": 1, "253": 1, "254": 1, "255": 1, "256": 1,
    "257": 1, "258": 1, "260": 1, "261": 1, "262": 1, "263": 1, "264": 1,
    "265": 1, "266": 1, "267": 1, "268": 1, "269": 1, "290": 1, "291": 1,
    "297": 1, "298": 1, "299": 1, "350": 1, "351": 1, "352": 1, "353": 1,
    "354": 1, "355": 1, "356": 1, "357": 1, "358": 1, "359": 1, "370": 1,
    "371": 1, "372": 1, "373": 1, "374": 1, "375": 1, "376": 1, "377": 1,
    "378": 1, "380": 1, "381": 1, "382": 1, "383": 1, "385": 1, "386": 1,
    "387": 1, "389": 1, "420": 1, "421": 1, "423": 1, "500": 1, "501": 1,
    "502": 1, "503": 1, "504": 1, "505": 1, "506": 1, "507": 1, "508": 1,
    "509": 1, "590": 1, "591": 1, "592": 1, "593": 1, "594": 1, "595": 1,
    "596": 1, "597": 1, "598": 1, "599": 1, "670": 1, "672": 1, "673": 1,
    "674": 1, "675": 1, "676": 1, "677": 1, "678": 1, "679": 1, "680": 1,
    "681": 1, "682": 1, "683": 1, "685": 1, "686": 1, "687": 1, "688": 1,
    "689": 1, "690": 1, "691": 1, "692": 1, "850": 1, "852": 1, "853": 1,
    "855": 1, "856": 1, "880": 1, "886": 1, "960": 1, "961": 1, "962": 1,
    "963": 1, "964": 1, "965": 1, "966": 1, "967": 1, "968": 1, "970": 1,
    "971": 1, "972": 1, "973": 1, "974": 1, "975": 1, "976": 1, "977": 1,
    "992": 1, "993": 1, "994": 1, "995": 1, "996": 1, "998": 1
  };
  if (threeDigit[three]) return three;
  return two;
}

function regionFor(code) {
  if (code === "1") return "NANP";
  if (code === "44") return "GB";
  return "UNSET";
}

export function snippetsFor(e164) {
  const number = e164 || "+12025550147";
  const encoded = encodeURIComponent(number);
  const curl =
    "curl -sS " + JSON.stringify(API_BASE + "/phone-reputation?number=" + encoded) + " \\\n" +
    "  -H \"Authorization: Bearer $LINEWISE_API_KEY\" \\\n" +
    "  -H \"Accept: application/json\"";

  const python =
    "import os\n" +
    "import requests\n\n" +
    "response = requests.get(\n" +
    "    \"" + API_BASE + "/phone-reputation\",\n" +
    "    params={\"number\": " + JSON.stringify(number) + "},\n" +
    "    headers={\"Authorization\": f\"Bearer {os.environ['LINEWISE_API_KEY']}\"},\n" +
    "    timeout=10,\n" +
    ")\n" +
    "response.raise_for_status()\n" +
    "print(response.json()[\"reputation\"][\"risk_score\"])\n";

  const node =
    "const number = " + JSON.stringify(number) + ";\n" +
    "const url = new URL(\"" + API_BASE + "/phone-reputation\");\n" +
    "url.searchParams.set(\"number\", number);\n\n" +
    "const response = await fetch(url, {\n" +
    "  headers: {\n" +
    "    Authorization: `Bearer ${process.env.LINEWISE_API_KEY}`,\n" +
    "    Accept: \"application/json\",\n" +
    "  },\n" +
    "});\n\n" +
    "if (!response.ok) {\n" +
    "  throw new Error(`Phone reputation API returned ${response.status}`);\n" +
    "}\n\n" +
    "const body = await response.json();\n" +
    "console.log(body.reputation.risk_score);\n";

  return { curl: curl, python: python, node: node };
}
