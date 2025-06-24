Onbrd.js
Onbrd.js is a lightweight JavaScript engine to create interactive onboarding experiences on web applications:

✅ Tooltips anchored to elements
✅ Modal steps (main steps)
✅ Highlights & guided tours
✅ Click triggers and form typing
✅ Supports cross-page onboarding
✅ Tiny footprint — no dependency except Popper.js v2
✅ Works with any framework (vanilla JS, React, Vue...)

Perfect for SaaS platforms, Admin Dashboards, B2B tools, Internal apps.

✨ Key Features
Why Onbrd.js is more powerful than most onboarding tools:

✅ Supports both main modals and tooltips
✅ Click interception: wait for a user click before progressing (ex: "Click Add User")
✅ Control whether click is passed through (passThrough: true|false)
✅ Typewriter effect: simulate typing in fields (ex: forms)
✅ NextCondition: dynamically enable Next button (ex: user must fill form)
✅ Auto scroll & highlight
✅ Waits for async content (waitForElement)
✅ Cross-page onboarding with persistence
✅ Tiny bundle, works with any stack: vanilla JS, React, Vue, Angular
✅ No runtime dependency except Popper.js (2kb gzipped)
✅ Full CSS customization and localization

🚀 Installation
via npm
bash
Copy
Edit
npm install onbrd
js
Copy
Edit
import Onbrd from 'onbrd';
import 'onbrd/dist/onbrd.css';
via CDN
html
Copy
Edit
<link rel="stylesheet" href="onbrd.css" />
<script src="https://unpkg.com/@popperjs/core@2"></script>
<script src="onbrd.js"></script>
🧩 Basic Usage
js
Copy
Edit
const onboarding = new Onbrd({
  steps: [
    { stepId: 'welcome', type: 'main', html: '<h2>Welcome!</h2><p>This is your onboarding tour.</p>' },
    { stepId: 'feature1', type: 'tooltip', selector: '#feature1', text: 'This is feature 1.', position: 'right' },
    { stepId: 'finish', type: 'main', html: '<h2>All done!</h2><p>You completed the tour.</p>' }
  ],
  autoStart: true
});
When autoStart: true is set, Onbrd waits for DOM ready and starts automatically.

⚙️ Configuration
Option  Type  Description
steps Array Ordered list of steps (see below)
colors  Object  Customize primary, dark, overlay, background colors
font  String  Font-family used by the UI
labels  Object  Text labels for buttons
storageKey  String | null Key used to persist progress in localStorage (or null for no persistence)
storage Storage Custom storage object (optional)
forceExitConfirm  Boolean Ask confirmation before exiting the tour
onStart Function  Called when the tour starts
onShowStep(step, index) Function  Called when a step is displayed
onComplete  Function  Called when last step is completed
onExit  Function  Called when the tour ends
onError(err, step)  Function  Called if a step cannot be displayed
autoStart Boolean Start automatically (default: true)

📚 Steps definition
Each step object can be:

type: 'main' → Modal step (centered dialog)

type: 'tooltip' → Anchored to a DOM element

Common properties for all steps:
Property  Description
stepId  Required identifier
type  'main' or 'tooltip'
html or text  Content of the step
selector  CSS selector for tooltip (required for tooltips)
position  Tooltip position: 'top', 'bottom', 'left', 'right'
captureClick  If true, waits for a click on target element
passThrough If false, original click is prevented (default: true)
typewriter  Simulates typing inside input (tooltip)
moreInfo  Optional extra HTML block in tooltip
onEnter Called when the step is displayed
onLeave Called when leaving the step
onNext  Called when Next is clicked
onPrev  Called when Prev is clicked
goBack(cb)  For "go back" handling on captureClick steps
waitForElement  Wait for element before showing (selector or function returning a promise)
nextCondition Enables Next button only when condition returns true
skipHiddenElement If true and element is hidden, skips step
autoFocus Focus input when using typewriter
skipOnDisappear If false, pauses if element disappears (default: skips)

🔍 API Methods
Method  Description
start() Start the tour (resume progress if storage enabled)
restart() Restart from first step
pause() / resume()  Pause / resume tour
goToStep(idOrIndex) Jump to a specific step
isActive()  Check if tour is running
enableCrossPage() Enable cross-page persistence
disableCrossPage()  Disable cross-page persistence

🎨 Styling / Theming
Onbrd exposes the following CSS variables:

css
Copy
Edit
:root {
  --onb-primary: #0066ff;
  --onb-dark: #222222;
  --onb-font: Inter, sans-serif;
  --onb-overlay: rgba(10,10,10,0.1);
  --onb-bg: rgba(255,255,255,0.92);
}
You can override them globally or dynamically.

🌍 Labels & Localization
You can customize all UI labels:

js
Copy
Edit
labels: {
  next: 'Suivant →',
  prev: '← Retour',
  skip: 'Passer',
  close: '✖',
  step: 'Étape',
  of: 'sur',
  confirmExit: 'Quitter le tutoriel ?'
}
🔄 Cross-page onboarding
Load plugin:

html
Copy
Edit
<script src="onbrd-crosspage.js"></script>
Enable in code:

js
Copy
Edit
registerCrossPage(Onbrd);
onboarding.enableCrossPage();
onboarding.start();
🏗️ Example: Admin Dashboard Tour
js
Copy
Edit
steps: [
  { stepId: 'welcome', type: 'main', html: '<h2>Welcome to your Admin Dashboard</h2>' },
  { stepId: 'sidebar', type: 'tooltip', selector: '#sidebar', text: 'Navigation menu', position: 'right' },
  { stepId: 'btn-add', type: 'tooltip', selector: '#btn-add-user', text: 'Click to add user', captureClick: true, passThrough: false },
  { stepId: 'form-name', type: 'tooltip', selector: '#input-name', text: 'Enter user name', typewriter: 'Alice', autoFocus: true },
  { stepId: 'finish', type: 'main', html: '<h2>Tour complete!</h2>' }
]
⚠️ Requirements
Onbrd requires Popper.js v2:

html
Copy
Edit
<script src="https://unpkg.com/@popperjs/core@2"></script>
📁 Project structure
css
Copy
Edit
src/
dist/
README.md
CHANGELOG.md
package.json
onbrd.js
onbrd-crosspage.js
onbrd.css
📃 License & Commercial Use
MIT License

You can use, copy, and modify Onbrd for free for:

✅ Personal
✅ Educational
✅ Non-profit
✅ Open-source projects

Commercial use requires a license (per company):
👉 $30 one-time lifetime → PayPal: https://paypal.me/brathelot

An invoice will be issued to the company name and email you provide.

Examples of commercial use:

Proprietary SaaS

B2B or internal tools

Client projects

Commercial websites/apps

You may not resell, redistribute, or sublicense the library.

💬 Support & Contact
Issues and PR on GitHub

Email: benjamin [at] rathelot [dot] com (no spam please!)

🚫 Disclaimer
The software is provided as-is, without warranty of any kind, express or implied.
In no event shall the author be liable for any damages, losses or claims of any kind.

👉 Ready to improve your onboarding? See the try me.html demo! 🚀