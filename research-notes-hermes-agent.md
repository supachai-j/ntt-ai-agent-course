# Deep Research: Hermes Agent (Nous Research) — สำหรับปรับปรุง Module 02

## TL;DR

- **Hermes Agent** เป็น open-source AI agent (MIT license) โดย **Nous Research** [1] — lab เดียวกับที่ทำ
  โมเดล Hermes, Nomos, และ Psyche [2]
- รันเป็นทั้ง CLI/TUI, messaging gateway, และ Electron desktop app จาก **agent core เดียวกัน** [2]
- Gateway รองรับ **20+ platforms** [2] — กว้างกว่าที่ Module 02 เดิมยกตัวอย่างไว้แค่ 3 อย่างมาก
- จุดขายหลักคือ **closed learning loop** — agent สร้าง skill เองจากประสบการณ์ [2], skill self-improve
  ระหว่างใช้งาน [2], cross-session memory recall ผ่าน FTS5 + LLM summarization [2]
- ระบบรองรับ pluggable memory provider เช่น Honcho dialectic user modeling ด้วย [2]
- Repo ที่ checkout อยู่ในเครื่อง (`/home/ubuntu/.hermes/hermes-agent`) คือ primary source ตรงจาก
  `github.com/NousResearch/hermes-agent` [1] — commit ล่าสุดที่ตรวจคือ 2026-09-09 (จาก local `git log`,
  ไม่ได้มาจาก source [1]-[10] โดยตรง แต่จากการรัน `git log -1` บนเครื่อง)

## รายละเอียด/กลไก

### สถาปัตยกรรมหลัก (ตรงกับที่ Module 02 เขียนไว้ เป็นส่วนใหญ่)
- **Agent Loop**: `AIAgent` facade (`run_agent.py`) เป็น synchronous orchestration engine [7]
- Loop จริงอยู่ใน `agent/conversation_loop.py` และ `agent/turn_*.py` [7]
- หน้าที่ของ loop: provider selection, prompt construction, tool execution, retries, fallback,
  callbacks, compression, และ persistence [7]
- **Prompt System** ประกอบด้วย 3 tier: identity/tool-guidance/skills → context files → memory/
  profile/timestamp blocks [7] — ตรงกับหลักการที่ Module 02 สอนเรื่อง system prompt layering
- **Provider Resolution** เป็น shared runtime resolver ที่ใช้ร่วมกันทั้ง CLI, gateway, cron, และ
  ACP [7] — map `(provider, model)` tuple ไปเป็น `(api_mode, api_key, base_url)` [7]

### Profiles — รายละเอียดที่ Module 02 เขียน "ถูกแต่ไม่ครบ"
- คำนิยามทางการของ profile คือ "a separate Hermes home directory" [9]
- Hermes รู้จัก directory ใต้ `~/.hermes/profiles/` ว่าเป็น profile ก็ต่อเมื่อมี identity file อย่าง
  น้อยหนึ่งอย่างจากรายการนี้: `config.yaml`, `.env`, `SOUL.md`, `profile.yaml`, `auth.json`, หรือ
  `state.db` [9] — โฟลเดอร์เปล่าที่เหลือจาก logging/cron ไม่ถูกนับเป็น profile [9]
- คำเตือนทางการที่สำคัญและ Module 02 เดิมไม่มี: **"Never point two agent processes at the same
  profile"** [9] — สอง process ที่เขียน memory เข้า home เดียวกันจะโหลด write ของกันและกันเข้า system
  prompt ทุก session start จนสถานะพัง [9] ควรใช้ external memory provider แทนถ้าต้องการ shared memory
  จริง [9]
- Official docs แยก terminology ไว้ชัดเจน 5 คำที่ Module 02 ยังไม่เคยนิยามครบ [9]:
  - **Profile** คือ persistent home สำหรับ config+data ของ assistant [9]
  - **Agent** คือ running instance ที่ใช้ profile นั้นอยู่ [9]
  - **Bot** คือ profile ที่ถูก present เป็น roster entry ใน Bot Mode พร้อม avatar และ persistent Bot
    Chat — ไม่ใช่ทุก profile จะเป็น Bot [9]
  - **Platform account** คือ account จริงบนแพลตฟอร์มอย่าง Telegram/Discord ที่ผูกกับ gateway ผ่าน
    bot token [9]
  - **Subagent** คือ child assistant ที่เกิดจาก `delegate_task` มี conversation แยกใหม่ แต่ไม่ใช่
    profile แยก [9]
- เมื่อสร้าง profile ใหม่ มันกลายเป็น command ของตัวเองทันที — เช่น profile ชื่อ `coder` จะมี
  `coder chat`, `coder setup`, `coder gateway start` โดยอัตโนมัติ [9]
- `--clone` flag คัดลอก `config.yaml`, `.env`, `SOUL.md`, skills, และ curated memory (`MEMORY.md`,
  `USER.md`) ไปยัง profile ใหม่ — official docs ระบุว่า treat memory เป็นส่วนหนึ่งของ agent identity
  เหมือนกับ SOUL.md [9]

### Skills System — คอนเซ็ปต์ที่ Module 02 พลาดไป
- Skill ของ Hermes เข้ากันได้กับ **agentskills.io open standard** [8] — เป็น format เปิดที่ portable
  ข้าม tool อื่นได้ ไม่ใช่ format เฉพาะของ Hermes เท่านั้น [1][8]
- หลักการออกแบบเรียกว่า **progressive disclosure pattern** [8] — ตรงกับที่ Module 02 อธิบายเรื่อง
  "โหลดเฉพาะเมื่อ relevant" แต่ officially ใช้คำนี้เป็นชื่อทางการ [8]
- `~/.hermes/skills/` เป็น **primary directory และ source of truth เดียว** [8] ไม่ใช่แค่ path
  ตัวอย่างเฉยๆ — bundled skills ถูก copy มาตอน fresh install [8], skill จาก hub และที่ agent สร้างเอง
  ก็ไปที่นี่ทั้งหมด [8] รองรับ external skill directories เพิ่มเติมได้ด้วย [8]
- **`/learn` command** เป็นฟีเจอร์ที่ Module 02 ไม่มีเลย — เป็นวิธีเร็วในการแปลงความรู้/เอกสารอ้างอิง
  เป็น skill โดยไม่ต้องเขียน SKILL.md ด้วยมือ [8] agent จะ gather material เองด้วย tool ที่มีอยู่แล้ว
  แล้ว author skill ตาม house authoring standard [8]
- House standard กำหนด description length ไว้ที่ **≤60 ตัวอักษร** [8] — ตัวเลขนี้ต่างจากที่ Module 02
  เขียนไว้ว่า "~57 ตัวอักษร" เล็กน้อย ควรแก้ไขให้ตรง
- Skill stacking: เรียกได้หลาย skill พร้อมกันในคำสั่งเดียว โดย chain slash command ได้สูงสุด 5 ตัว
  ต่อข้อความ [8]
- **Autonomous Curator**: community-maintained directory ระบุว่า `hermes curator` รีวิว skill ที่
  agent สร้างเอง, consolidate ที่ซ้ำซ้อน, และ archive ที่ล้าสมัย [5] — ฟีเจอร์ self-improvement loop
  ที่ Module 02 เดิมไม่ได้พูดถึงเลย

### Tools & Toolsets — ตัวเลขและ category ที่ต้องอัปเดต
- Official Tools & Toolsets page ไม่ได้ยืนยันตัวเลขนับรวมของ built-in tools ในหน้านั้นโดยตรง — ตัวเลข
  "60+" ปรากฏเฉพาะในคำโปรยสั้นๆ ของหน้า docs index เท่านั้น [3] ควรระบุใน slide พร้อม caveat แทนอ้างเป็น
  authoritative count
- Official category แบ่งเป็น 9 กลุ่มตาม Tools & Toolsets page [10]:
  Web (web_search, web_extract), X Search (x_search, gated ด้วย xAI credential), Terminal & Files
  (terminal, process, read_file, patch), Browser (browser_navigate, browser_snapshot, browser_vision),
  Media (vision_analyze, image_generate, text_to_speech), Agent orchestration (todo, clarify,
  execute_code, delegate_task), Memory & recall (memory, session_search), Automation (cronjob), และ
  Integrations (ha_* สำหรับ Home Assistant, MCP server tools) [10]
- Toolset ชื่อจริงตาม official docs มีทั้ง: web, search, terminal, file, browser, vision, image_gen,
  skills, tts, todo, memory, session_search, cronjob, code_execution, delegation, clarify,
  homeassistant, messaging, spotify, discord, discord_admin, debugging, และ safe [10] รวมถึง platform
  preset เช่น `hermes-cli`, `hermes-telegram` และ dynamic MCP toolset แบบ `mcp-<server>` [10]
- **Nous Portal / Tool Gateway** เป็นฟีเจอร์ที่ Module 02 ไม่มีเลย — paid subscriber ใช้ web search/
  image gen/TTS/browser ผ่าน Tool Gateway โดยไม่ต้องมี API key แยกต่างหาก [10][2] คล้ายกับสถานการณ์ที่
  ตั้มมี ChatGPT Enterprise/Gemini Plus แต่ไม่มี API key แยก (บันทึกไว้ใน memory ของ session อื่นแล้ว)
  — เป็นตัวอย่างเปรียบเทียบที่ดีสำหรับสอน presale/engineer ว่า "subscription ≠ API access"

### MCP Integration
- Hermes รองรับ MCP เต็มรูปแบบ ติดตั้งมาพร้อม standard install script ที่รัน
  `uv pip install -e ".[all]"` [unverified — เจอจาก web_search snippet ของหน้า "Use MCP with Hermes"
  เท่านั้น ยังไม่ได้เปิดอ่านเต็มหน้า]
- `mcporter` เป็นเครื่องมือ CLI แยกสำหรับ list/auth/call MCP servers — auto-discover server ที่ config
  ไว้จาก MCP client อื่นบนเครื่องเดียวกัน เช่น Claude Desktop, Cursor [unverified — เจอจาก web_search
  snippet เท่านั้น ยังไม่ได้เปิดอ่านเต็มหน้า]

## เบื้องหลัง

Nous Research เป็น AI lab ที่รู้จักจากโมเดลตระกูล Hermes (fine-tune), Nomos, และ Psyche (decentralized
training) [2] Hermes Agent เป็นผลิตภัณฑ์ open-source ภายใต้ MIT license ที่ทีมเดียวกันสร้าง [1] ใช้ชื่อ
"Hermes" ร่วมกับโมเดลของตัวเอง แต่ตัว agent ไม่ผูกกับโมเดล Hermes เท่านั้น — รองรับ Nous Portal,
OpenRouter, OpenAI, หรือ endpoint อื่นที่ผู้ใช้เลือกเองได้ทั้งหมด [1]

## ตรวจ official claim vs สิ่งที่ Module 02 เขียนไว้ก่อนหน้า (กฎข้อ 13)

**เรื่อง Connectors:** Module 02 เดิมเขียนว่า "Discord, Telegram, Email ฯลฯ" ส่วน official docs ระบุ
รายชื่อจริงกว่า 20 platform: Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Mattermost, Email,
SMS, DingTalk, Feishu, WeCom, Weixin, QQ Bot, Yuanbao, BlueBubbles, Home Assistant, Microsoft Teams,
Google Chat และอื่นๆ [2] Module 02 เดิมไม่ได้ผิด แต่ตัวอย่างแคบกว่าความเป็นจริงมาก ควรอัปเดตให้เห็นภาพ
ว่า multi-channel จริงจังแค่ไหน — official source [2] น่าเชื่อถือกว่าเพราะเป็นหน้า official product site

**เรื่อง skill description length:** Module 02 เขียนว่า "~57 ตัวอักษรแรก" ส่วน official house standard
ที่ระบุใน docs คือ ≤60 ตัวอักษร [8] คลาดเคลื่อนเล็กน้อย ควรแก้เป็น 60 ตามแหล่งทางการ [8]

**เรื่อง subagent orchestration:** Module 02 อธิบายผ่าน `delegate_task` ตรงกับ official definition
ที่ระบุว่าเป็น "child assistant... fresh conversation, separate from a separate profile" [9] — ถูกต้อง
ตรงกัน ไม่ต้องแก้

**เรื่อง skills path:** Module 02 บอก path `~/.hermes/profiles/<name>/skills/` ถูกต้องตรงกับที่ official
docs ยืนยันว่าเป็น source of truth จริง [8] ไม่ใช่แค่ตัวอย่าง — ถูกต้อง เพิ่มคำว่า "source of truth" ได้

ไม่พบข้อขัดแย้งใหญ่ระหว่าง official claim กับพฤติกรรมจริงในรอบนี้ [9] เพราะ deep research นี้เทียบเนื้อหา
คอร์สที่เขียนเองกับเอกสารทางการ [7][8][10] ไม่ใช่เทียบคำโฆษณากับผลทดสอบอิสระของบุคคลที่สาม ยังไม่ได้ทดสอบ
Hermes เวอร์ชัน production จริงเทียบกับสิ่งที่ระบุใน docs

## สรุปเชิงวิศวกร — เอาไปปรับ Module 02 ยังไง

ข้อเสนอปรับปรุงที่ทำได้จริงใน slides.html/lab.html ของ Module 02 โดยอ้างอิงจาก source ที่ตรวจสอบแล้ว
ข้างต้น [7][8][9][10]:

1. แก้ตัวเลข 57 → 60 ตัวอักษร ตาม house standard จริง [8]
2. ขยาย Connectors slide จาก 3 ตัวอย่าง (Discord/Telegram/Email) เป็นสไลด์ที่โชว์ 20+ platforms จริง
   พร้อมอ้างอิง official docs [2] — ตอกย้ำว่า Hermes ไม่ใช่ "Discord bot ที่มี AI" แต่เป็น
   multi-platform gateway จริงจัง
3. เพิ่ม terminology slide ใหม่: Profile vs Agent vs Bot vs Platform Account vs Subagent ตาม official
   definition [9] — เพิ่มความแม่นยำให้คอร์ส
4. เพิ่ม safety warning slide: "Never point two agent processes at the same profile" [9] — เป็น
   official warning ที่ engineer ควรรู้ก่อนเอา Hermes ไปใช้จริงหลาย instance เข้ากับธีม Module 08
   Enterprise Governance ได้ดี
5. เพิ่ม `/learn` command [8] — ฟีเจอร์ที่ไม่เคยพูดถึงเลยแต่มีประโยชน์มากสำหรับ presale ที่อยากสอน
   agent เร็วๆ โดยไม่ต้องเขียน SKILL.md มือ
6. แก้ Tools table ให้ตรงกับ 9 official category [10] แทนการแบ่งเองแบบ 2 กลุ่ม (Always-loaded/
   Orchestration) ที่ Module 02 เขียนไว้ก่อนหน้า — ของทางการละเอียดและ verifiable กว่า
7. เพิ่ม Nous Portal / Tool Gateway concept [10][2] — เชื่อมโยงกับประสบการณ์ตรงเรื่อง subscription
   vs API key ที่ presale เข้าใจง่าย

## ข้อควรระวังความน่าเชื่อถือ

- ข้อมูลส่วนใหญ่ดึงจาก official Nous Research docs (nousresearch.com subdomain) [2][3][7]. เอกสาร
  official เพิ่มเติมที่ใช้คือ [8][9][10] และ official GitHub repo [1] — ความน่าเชื่อถือสูงเพราะเป็น
  primary source โดยตรง
- Local repo checkout มี commit ล่าสุดจากการรัน `git log -1` บนเครื่องคือ 2026-09-09 — ข้อมูลโค้ดจริง
  อาจไม่ตรงกับเวอร์ชันที่ deploy รันคอร์สอยู่ทุกจุด 100% เพราะ product พัฒนาเร็ว (เห็นจาก docs พูดถึง
  ฟีเจอร์จำนวนมาก เช่น Kanban, Bot Mode, Mixture of Agents ที่ deep research รอบนี้ยังไม่ได้ตรวจละเอียด)
- ตัวเลข "60+ built-in tools" มาจากคำโปรยสั้นบนหน้า docs index เท่านั้น [3] ไม่ใช่ authoritative count
  จากหน้า "Built-in Tools Reference" หรือ "Toolsets Reference" โดยตรง — ถ้าต้องการตัวเลขแม่นยำ 100%
  ควรเปิดสองหน้านั้นแล้วนับจริงก่อนใช้ในสไลด์
- ส่วน MCP Integration ในรายงานนี้มาจาก web search snippet เท่านั้น (ยังไม่ได้เปิดหน้าเต็มอ่าน) —
  ทำเครื่องหมาย unverified ไว้ชัดเจนแล้ว ควรเปิดอ่านเต็มก่อนใช้เนื้อหานี้ในสไลด์จริง
- ยังไม่ได้ตรวจ per-directory AGENTS.md ย่อย (`agent/AGENTS.md`, `tools/AGENTS.md` ฯลฯ) — root
  AGENTS.md [4] ที่โหลดมาแล้วครอบคลุมแค่ระดับ dev workflow ทั่วไป ไม่ใช่ implementation detail เชิงลึก
  แหล่งอย่าง DeepWiki [6] มีหน้าเจาะลึกเรื่อง Skills/Tools/Plugins ที่ยังไม่ได้เปิดอ่านเต็มในรอบนี้
- ข้อมูลนี้คือ deep research ระดับ "product/docs overview" ไม่ใช่ code audit เต็มรูปแบบ — ไม่ได้รัน
  ทดสอบ Hermes จริงเทียบพฤติกรรมกับ docs (เช่น ยังไม่ได้ทดสอบว่า `/learn` ทำงานตามที่ docs บอกจริงไหม)

## Sources

[1] https://github.com/NousResearch/hermes-agent — Hermes Agent official GitHub repository (NousResearch)
[2] https://hermes-agent.nousresearch.com — Hermes Agent official product site (Nous Research)
[3] https://hermes-agent.nousresearch.com/docs — Hermes Agent official documentation index
[4] https://github.com/NousResearch/hermes-agent/blob/main/AGENTS.md — hermes-agent AGENTS.md development guide (GitHub)
[5] https://github.com/0xNyk/awesome-hermes-agent — Awesome Hermes Agent, independent curated directory
[6] https://deepwiki.com/nousresearch-hermes-agent/hermes-agent/5-skills-tools-and-plugins — DeepWiki, Hermes Agent Skills/Tools/Plugins
[7] https://hermes-agent.nousresearch.com/docs/developer-guide/architecture — Hermes Agent Docs, Architecture
[8] https://hermes-agent.nousresearch.com/docs/user-guide/features/skills — Hermes Agent Docs, Skills System
[9] https://hermes-agent.nousresearch.com/docs/user-guide/profiles — Hermes Agent Docs, Profiles: Running Multiple Agents
[10] https://hermes-agent.nousresearch.com/docs/user-guide/features/tools — Hermes Agent Docs, Tools & Toolsets

(หมายเหตุ: [6] DeepWiki ปรากฏเฉพาะใน search result metadata ระหว่าง research ยังไม่ได้เปิดอ่านเนื้อหา
เต็มหน้า — ใช้เป็น pointer สำหรับ deep-dive รอบถัดไปเท่านั้น ไม่ใช่แหล่งข้อมูลหลักของรายงานนี้)
