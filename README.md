<div align="center">

<h1>CLINCH</h1>

<p><strong>Adaptive Red-Team &amp; Blue-Team Payment Defense</strong></p>

<img src="public/favicon.svg" width="150" alt="Clinch Logo"/>

<br/><br/>

![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&duration=2800&pause=900&color=00C6FF&center=true&vCenter=true&width=780&lines=A+fraud-defense+system+that+attacks+itself+to+discover+and+fix+its+own+blind+spots)

</div>

<br/>

![Status](https://img.shields.io/badge/STATUS-OPERATIONAL-00e676?style=for-the-badge&labelColor=0d1117)
![Build](https://img.shields.io/badge/PIPELINE-PASSING-2ea3f2?style=for-the-badge&labelColor=0d1117)
![License](https://img.shields.io/badge/LICENSE-MIT-a663cc?style=for-the-badge&labelColor=0d1117)
![Made With](https://img.shields.io/badge/MADE%20WITH-%E2%9D%A4%EF%B8%8F%20%2B%20CAFFEINE-ff5c8a?style=for-the-badge&labelColor=0d1117)

<br/>

<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"/>
<img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white"/>
<img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white"/>
<img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi"/>
<img src="https://img.shields.io/badge/Python-FFD43B?style=for-the-badge&logo=python&logoColor=blue"/>
<img src="https://img.shields.io/badge/XGBoost-EC4E20?style=for-the-badge"/>
<img src="https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white"/>
<img src="https://img.shields.io/badge/NetworkX-11557C?style=for-the-badge"/>

</div>

<br/>

---

## 📡 Transmission Log — Table of Contents

- [Mission Briefing](#-mission-briefing)
- [The Core Innovation](#-the-core-innovation)
- [System Architecture](#-system-architecture)
- [The Adversarial Feedback Loop](#-the-adversarial-feedback-loop)
- [🔴 Red Team — Attack Agent Roster](#-red-team--attack-agent-roster)
- [🔵 Blue Team — Detection Layer Stack](#-blue-team--detection-layer-stack)
- [Risk Fusion & Decisioning](#-risk-fusion--decisioning)
- [Command Center Dashboard](#️-command-center-dashboard)
- [API Surface](#-api-surface)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [The Squad](#-the-squad)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🎯 Mission Briefing

> Traditional fraud detection systems lean on **static rules** and **previously known attack signatures**. The moment an adversary mutates their behaviour or invents something new, that defense go[...]

**SentinelPay AI** flips the model. Instead of passively waiting to be attacked, the system **attacks itself, continuously** — an autonomous Red Team generates evolving synthetic fraud, an indep[...]

```
   Attack  →  Detection  →  Evaluation  →  Learning  →  Defense Improvement  →  Retest
```

This isn't detection. It's **defense-in-depth that gets sharper every time it's tested.**

---

## 💡 The Core Innovation

<div align="center">

| ❌ Conventional Fraud Detection | ✅ SentinelPay AI |
|:---|:---|
| Single ML model, static thresholds | Rules + ML + Anomaly Detection + Graph + RAG/LLM, fused |
| Blind to zero-day / novel patterns | Purpose-built Novelty Agent to probe unknown blind spots |
| Detect → done | Detect → Explain → Feedback → **Adapt** → Retest |
| Black-box risk scores | Human-readable AI explanations, per decision |
| Manually curated test cases | Autonomous adversarial simulation, 24/7 |

</div>

> **One-line USP:**
> *"A fraud-defense system that doesn't just detect attacks — it attacks itself to discover and improve its own blind spots."*

---

## 🏗 System Architecture

```mermaid
flowchart TD
    subgraph RED["🔴 RED TEAM — Adversarial Engine"]
        direction TB
        R1[Synthetic Payment<br/>Environment]
        R2[6 Attack Agents]
        R3[Orchestrator<br/>AUTO-00]
        R1 --> R2 --> R3
    end

    subgraph RAG["🧠 Knowledge Layer"]
        K1[(Fraud Pattern<br/>Knowledge Base)]
        K2[RAG Retrieval +<br/>LLM Reasoning]
        K1 <--> K2
    end

    subgraph BLUE["🔵 BLUE TEAM — Detection Engine"]
        direction TB
        B1[Rule / Velocity<br/>Engine]
        B2[ML Fraud<br/>Classifier]
        B3[Anomaly Detector<br/>Isolation Forest + LOF]
        B4[Graph Analysis<br/>NetworkX]
        B5[RAG / LLM<br/>Reasoner]
        B6{{Risk Fusion<br/>Engine}}
        B1 & B2 & B3 & B4 & B5 --> B6
    end

    subgraph ACTION["⚖️ Decision Layer"]
        D1[/"ALLOW · HOLD · VERIFY · BLOCK"/]
        D2[AI Explanation Engine]
        D1 --> D2
    end

    subgraph LOOP["🧬 Adaptive Defense"]
        F1[Analyst Feedback<br/>Confirm / False Positive]
        F2[Active Learning<br/>Pattern Update]
        F3[Model / Rule / Signature<br/>Retraining]
        F1 --> F2 --> F3
    end

    R3 -->|Synthetic Transactions| BLUE
    K2 -.->|Similar Pattern Retrieval| B5
    BLUE --> ACTION
    ACTION --> F1
    F3 -.->|Strengthened Defense| BLUE
    F3 -.->|New Test Vectors| RED

    style RED fill:#3b0d0d,stroke:#ff4d4d,stroke-width:2px,color:#fff
    style BLUE fill:#0d1b3b,stroke:#4da6ff,stroke-width:2px,color:#fff
    style RAG fill:#1a0d3b,stroke:#a663cc,stroke-width:2px,color:#fff
    style ACTION fill:#0d3b1a,stroke:#00e676,stroke-width:2px,color:#fff
    style LOOP fill:#3b2b0d,stroke:#ffb800,stroke-width:2px,color:#fff
```

---

## 🔁 The Adversarial Feedback Loop

The signature mechanism of SentinelPay AI — the system doesn't just get attacked, it **learns from every exchange**:

```mermaid
sequenceDiagram
    autonumber
    participant RT as 🔴 Red Team Orchestrator
    participant BT as 🔵 Blue Team Pipeline
    participant AN as 👤 Analyst
    participant AD as 🧬 Adaptive Defense

    RT->>BT: Generate & send synthetic attack (e.g. NOV-01)
    BT->>BT: Run Rules + ML + Anomaly + Graph + RAG
    BT-->>RT: Initial Verdict — ❌ MISSED (unknown pattern)
    BT->>AN: Flag transaction with AI Explanation
    AN->>AD: Confirm Fraud / Mark False Positive
    AD->>AD: Update Fraud Knowledge Base
    AD->>AD: Update Detection Rule
    AD->>AD: Update Attack Signature
    AD->>RT: Trigger Retest
    RT->>BT: Re-send same / evolved attack
    BT-->>AN: New Verdict — ✅ DETECTED (91/100)
    Note over BT,AD: Detection capability permanently improved
```

**Before adaptation → Missed.**
**After adaptation → Detected.**
That delta, measured and visualized, is the strongest proof point in the entire system.

---

## 🔴 Red Team — Attack Agent Roster

Six autonomous agents, each engineered to probe a distinct fraud vector:

<div align="center">

| Agent ID | Codename | Threat Simulated | Detection Goal |
|:---:|:---|:---|:---|
| `ATK-07` | 🕵️ **Account Takeover** | Compromised device + location + amount deviation from user baseline | Behavioral inconsistency detection |
| `VEL-03` | ⚡ **Velocity Fraud** | Rapid transaction bursts, individually plausible | Frequency & cumulative activity analysis |
| `BHV-11` | 🎭 **Behavioral Mimicry** | Gradual behavioral drift disguised as normal spend growth | Long-horizon trend detection |
| `SPL-02` | 🔪 **Transaction Splitting** | One large transaction fragmented into many small ones | Cumulative value correlation |
| `NOV-01` | 🧬 **Novelty / Zero-Day** | Combined *moderate* anomalies never seen in training | Unsupervised anomaly + low-confidence containment |
| `AUTO-00` | 🧠 **Orchestrator** | Coordinates all agents, runs full campaigns, logs Blue Team responses | Defense coverage reporting |

</div>

<details>
<summary><b>📖 Expand: Example scenario — Account Takeover (ATK-07)</b></summary>
<br/>

```diff
NORMAL BASELINE                    SYNTHETIC ATTACK
- Device: Android                  + Device: Unknown
- Location: Mumbai                 + Location: Delhi
- Avg. transaction: ₹2,000         + Transaction: ₹45,000
- Frequency: 2–3 / day             + Frequency: 6 in 5 minutes
```

**Expected Blue Team response:** `VERIFY` → `HOLD` → `BLOCK`, scaling with combined signal severity.

</details>

<details>
<summary><b>📖 Expand: Example scenario — Novelty / Zero-Day (NOV-01)</b></summary>
<br/>

No single signal is severe on its own:

```
Amount deviation   → Medium
Device anomaly     → Slightly unusual
Location            → New but plausible
Transaction time    → Unusual
Velocity            → Slightly increased
```

**Combined effect:** the known fraud model can't confidently classify it — but anomaly detection flags significant deviation.

```
High anomaly  +  Low confidence  =  HOLD
```

> *If the system doesn't understand a pattern well enough to safely approve it, the transaction is contained — not ignored.*

</details>

---

## 🔵 Blue Team — Detection Layer Stack

Seven independent detection layers, none of which is trusted alone:

<div align="center">

| # | Detector | Function |
|:---:|:---|:---|
| 1 | ⚙️ **Rule-Based Detector** | Deterministic thresholds & known suspicious patterns |
| 2 | 🤖 **ML Fraud Classifier** | XGBoost / HistGradientBoosting — learned fraud probability |
| 3 | 📊 **Anomaly Detector** | Isolation Forest + Local Outlier Factor — unsupervised deviation |
| 4 | ⚡ **Velocity Checker** | High-frequency / rapid transaction detection |
| 5 | 🕸️ **Graph Engine** | NetworkX — device-sharing rings, mule networks, high-centrality nodes |
| 6 | 🧠 **RAG / LLM Reasoner** | Retrieves similar historical fraud patterns, generates natural-language reasoning |
| 7 | 🗣️ **AI Explanation Engine** | Converts fused signals into an analyst-readable justification |

</div>

> ⚠️ **Design principle:** the ML classifier is *intentionally* trained without the `zero_day_drain` pattern — this deliberately creates a blind spot so the Novelty Agent and Adaptive Defen[...]

---

## ⚖️ Risk Fusion & Decisioning

```mermaid
graph LR
    A[Rule Score] --> F{{Risk Fusion Engine}}
    B[ML Score] --> F
    C[Anomaly Score] --> F
    D[Graph Score] --> F
    E[RAG Similarity] --> F
    F --> G[/Final Risk Score 0–100/]
    G --> H{Decision}
    H -->|"< 40"| I[🟢 ALLOW]
    H -->|"40–70"| J[🟡 HOLD / VERIFY]
    H -->|"> 70"| K[🔴 BLOCK]

    style I fill:#0d3b1a,stroke:#00e676,color:#fff
    style J fill:#3b2b0d,stroke:#ffb800,color:#fff
    style K fill:#3b0d0d,stroke:#ff4d4d,color:#fff
```

**Sample response payload:**

```json
{
  "transaction_id": "TXN1001",
  "decision": "HOLD",
  "ml_score": 42.5,
  "rule_score": 30,
  "anomaly_score": 55.2,
  "graph_score": 20,
  "final_risk": 41.3,
  "explanation": "Elevated anomaly signal with moderate ML confidence — resembles a partially-known velocity pattern retrieved via RAG."
}
```

> A large transaction amount alone is never sufficient for a fraud verdict — every decision is contextual, multi-signal, and explainable.

---

## 🖥️ Command Center Dashboard

<div align="center">

```
╔═════════════════════════════════════════════════════════��╗
║ 🛡️  SENTINELPAY AI                        ● SYSTEM LIVE   ║
║     Autonomous Red-Team & Blue-Team Payment Defense       ║
╠══════════════════════════════════════════════════════════╣
║  Transactions    Fraud Detected    Attacks Run    Avg Risk║
║     12,840            1,284            320          7.4   ║
╠══════════════════════════════════════════════════════════╣
║  🔴 RED TEAM STATUS          🔵 BLUE TEAM STATUS           ║
║  Active Agent: AUTO-00       Detection Rate:   94.2%      ║
║  [ ⚡ GENERATE ATTACK ]       False Positive:    4.1%      ║
╠══════════════════════════════════════════════════════════╣
║  Recent Threats                                            ║
║  ATK-07   94/100   🔴 BLOCK      VEL-03   87/100   🟡 HOLD ║
║  BHV-11   72/100   🟡 VERIFY     NOV-01   81/100   🟡 HOLD ║
╚══════════════════════════════════════════════════════════╝
```

</div>

**Live modules shipped:**

- 📈 **Command Center** — real-time stats, dual Red/Blue status panels, live UTC clock, system-health strip
- ⚔️ **Red Team Lab** — agent selector + attack simulation console
- 🛰️ **Blue Team Analysis** — per-transaction detector breakdown + fused verdict
- 🤖 **RAG Threat Chatbot** — natural-language lookup by Transaction ID, explains adaptive-defense / active-learning reasoning
- 🧬 **Adaptive Defense** — Missed → Feedback → Retest → Detected timeline, per attack
- 👤 **Analyst Feedback Console** — confirm fraud / mark false positive
- 📊 **Analytics** — detection-rate & false-positive trendlines, before/after adaptive-defense comparison
- 🔐 **Authentication** — secured login gate
- 👥 **Team Page** — squad roster & ownership

---

## 🔌 API Surface

<div align="center">

| Method | Endpoint | Purpose |
|:---:|:---|:---|
| `POST` | `/red-team/attack` | Generate a synthetic adversarial transaction |
| `POST` | `/transaction` | Run the full multi-layer detection pipeline |
| `POST` | `/score-features` | Evaluate adaptive attack scenarios against detectors |
| `POST` | `/feedback` | Submit analyst confirm / false-positive verdict |
| `GET` | `/dashboard/summary` | Aggregate live dashboard metrics |
| `GET` | `/dashboard/transactions` | Transaction history feed |
| `GET` | `/dashboard/latest` | Most recent detection results |
| `GET` | `/alerts` | Active high-risk alerts |
| `GET` | `/attack-history` | Full Red Team campaign log |

</div>

Interactive Swagger docs available at `/docs` once the Blue Team API is running.

---

## 🧬 Technology Stack

<div align="center">

### Frontend
![React](https://img.shields.io/badge/React-black?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-black?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-black?style=flat-square&logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-black?style=flat-square&logo=vite)
![Lucide](https://img.shields.io/badge/Lucide_Icons-black?style=flat-square)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-black?style=flat-square)

### Backend & ML
![Python](https://img.shields.io/badge/Python-black?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-black?style=flat-square&logo=fastapi)
![Pydantic](https://img.shields.io/badge/Pydantic-black?style=flat-square)
![XGBoost](https://img.shields.io/badge/XGBoost-black?style=flat-square)
![scikit-learn](https://img.shields.io/badge/scikit--learn-black?style=flat-square&logo=scikit-learn)
![Pandas](https://img.shields.io/badge/Pandas-black?style=flat-square&logo=pandas)
![NumPy](https://img.shields.io/badge/NumPy-black?style=flat-square&logo=numpy)
![NetworkX](https://img.shields.io/badge/NetworkX-black?style=flat-square)

### Deployment
![GitHub](https://img.shields.io/badge/GitHub-black?style=flat-square&logo=github)
![Render](https://img.shields.io/badge/Render-black?style=flat-square&logo=render)
![Vercel](https://img.shields.io/badge/Vercel-black?style=flat-square&logo=vercel)

</div>

---

## 🚀 Getting Started

### Offline Detection Pipeline

```bash
# Install dependencies
python -m pip install -r requirements.txt

# Run the full pipeline in sequence
python 01_generate_data.py
python 02_features_and_rules.py
python 03_ml_classifier.py
python 04_anomaly_detection.py
python 05_graph_analysis.py
python 06_risk_fusion.py

# — or, if orchestrated —
python main.py
```

### Blue Team Live API

```bash
python -m uvicorn blue_team_api:app --reload
```

- API base: `http://127.0.0.1:8000`
- Swagger docs: `http://127.0.0.1:8000/docs`

### Frontend Dashboard

```bash
# from the repository root
npm install
npm run dev
```

- Dashboard: `http://localhost:5173`

---

## 👥 The Squad

<div align="center">

| | Sameera | Prathamesh | Sahil |
|:---:|:---:|:---:|:---:|
| **Role** | 🖥️ Dashboard, Backend & Integration Lead | 🔴 Red Team Lead | 🔵 Blue Team Lead |
| **Owns** | FastAPI backend · Database · Full dashboard UI · System integration | Synthetic data generation · All 6 attack agents · ML classifier | Rule engine · RAG + LLM reasoning · Gra[...]

</div>

---

## 🗺 Roadmap

- [ ] Real-time streaming via Kafka / WebSockets
- [ ] Reinforcement-learning-based attack agents
- [ ] Advanced Graph Neural Network detection
- [ ] Automated model retraining pipeline
- [ ] SHAP-based explainability layer
- [ ] Federated fraud learning across institutions
- [ ] Real banking / payment gateway integration
- [ ] Dockerized deployment

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for details.

<br/>

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:00c6ff,50:2c5364,100:0f2027&height=120&section=footer" width="100%"/>

**SentinelPay AI** — *It doesn't just defend. It learns how to defend better.*

</div>
