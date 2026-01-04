import { loadTaskCategories, loadTasksForCategory, getBaseUrl } from './apiService.js';

// --- Get Elements ---
const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const modeIndicator = document.getElementById('modeIndicator');
const mainActionBtn = document.getElementById('mainActionBtn');
const longBreakResetBtn = document.getElementById('longBreakResetBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn'); // Optional theme button ref
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.querySelector('.settings');
const workTimeInput = document.getElementById('workTime');
const breakTimeInput = document.getElementById('breakTime');
const longBreakTimeInput = document.getElementById('longBreakTime');
const serverUrlInput = document.getElementById('serverUrl');
const workRatioInput = document.getElementById('workRatio');
const applySettingsBtn = document.getElementById('applySettings');
const mainStatDisplay = document.getElementById('mainStatDisplay');
const progressCircle = document.querySelector('.progress-ring__circle');
const categorySelect = document.getElementById('taskCategory');
const taskSelect = document.getElementById('taskSelection');

// --- State Variables ---
let initialWorkTime;
let timerInterval = null;
let timeLeft;
let totalSessionDuration; // Duration of the current work/break/longBreak session in seconds
let currentSession = 'work';
let activeStackTask = null; // Track currently running task from stack
let taskStack = []; // Ensure this is declared if not already
let isPaused = true;
let totalWorkTimeElapsed = 0; // Net work time accumulated (work seconds - break cost)
let grossWorkTimeAccumulated = 0; // Total seconds spent in 'work' mode during the current run
let workRatio; // How many work units earn 1 break unit
const breakRatio = 1; // How many break units are earned (usually 1)
let currentTheme = localStorage.getItem('theme') || 'dark'; // Default to dark theme

let wakeLock = null; // Screen Wake Lock
// --- Constants ---
const DEFAULT_WORK_TIME = 25;
const DEFAULT_WORK_RATIO = 3;
const DEFAULT_BREAK_TIME = 5;
const DEFAULT_LONG_BREAK_TIME = 15;
const MIN_LOGGABLE_WORK_SECONDS = 30; // Minimum duration to log

// --- Progress Bar Calculation ---
let radius = 0;
let circumference = 0;

// --- Task Stack State ---

// Store SVG Icon HTML strings
const playIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="24" height="24"><path fill-rule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm6.39-2.908a.75.75 0 01.766.016l3.75 2.25a.75.75 0 010 1.284l-3.75 2.25a.75.75 0 01-1.158-.642V7.092a.75.75 0 01.392-.668z" clip-rule="evenodd" /></svg>`;
const pauseIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="24" height="24"><path fill-rule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zM8.25 7.25a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0v-5.5zM12.25 7.25a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0v-5.5z" clip-rule="evenodd" /></svg>`;
const bedIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="24" height="24"><path fill-rule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zM6.75 6.75a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clip-rule="evenodd" /></svg>`; // Solid Stop Square
const resetIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="24" height="24"><path fill-rule="evenodd" d="M15.312 11.342a1.25 1.25 0 010 1.768l-2.5 2.5a1.25 1.25 0 11-1.768-1.768L12.294 12.5H6.75a.75.75 0 010-1.5h5.544l-1.25-1.25a1.25 1.25 0 011.768-1.768l2.5 2.5z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M4.688 8.658a1.25 1.25 0 010-1.768l2.5-2.5a1.25 1.25 0 011.768 1.768L7.706 7.5h5.544a.75.75 0 010 1.5H7.706l1.25 1.25a1.25 1.25 0 11-1.768 1.768l-2.5-2.5z" clip-rule="evenodd" /></svg>`; // Example Reset Icon
const moonIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="24" height="24"><path fill-rule="evenodd" d="M7.455 1.05A8.967 8.967 0 0010 18.5c4.97 0 9-4.03 9-9a8.967 8.967 0 00-7.455-8.45A.75.75 0 0010.75 1a.75.75 0 00-.8.43l-.002.003z" clip-rule="evenodd" /></svg>`;
const sunIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="24" height="24"><path d="M10 3a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 3zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM14.142 5.858a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM3.793 15.207a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM17 10a.75.75 0 01.75.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75A.75.75 0 0117 10zM1.25 10a.75.75 0 01.75.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75A.75.75 0 011.25 10zM15.207 3.793a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM4.858 14.142a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM10 7a3 3 0 100 6 3 3 0 000-6z" /></svg>`;
const clockIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clip-rule="evenodd" /></svg>`;

// --- Screen Wake Lock Functions ---
const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Screen Wake Lock activated.');
            wakeLock.addEventListener('release', () => {
                // This happens if the system releases the lock (e.g., battery low)
                // or if releaseWakeLock() is called.
                console.log('Screen Wake Lock released.');
                // Ensure wakeLock is nullified if released externally or via our function
                if (wakeLock) wakeLock = null;
            });
        } catch (err) {
            console.error(`Screen Wake Lock request failed: ${err.name}, ${err.message}`);
            wakeLock = null;
        }
    } else {
        console.warn('Screen Wake Lock API is not supported by this browser.');
    }
};

const releaseWakeLock = async () => {
    if (wakeLock !== null) {
        try {
            await wakeLock.release();
            // The 'release' event listener above will set wakeLock to null
        } catch (err) {
            console.error(`Screen Wake Lock release failed: ${err.name}, ${err.message}`);
            // Force nullification even if release fails to avoid inconsistent state
            wakeLock = null;
        }
    }
};

// Handle page visibility changes for Wake Lock
const handleVisibilityChange = async () => {
    if (wakeLock !== null && document.visibilityState === 'hidden') {
        // Release the lock when the page is hidden, but don't change timer state
        await releaseWakeLock();
        console.log('Wake Lock released due to page becoming hidden.');
    } else if (document.visibilityState === 'visible' && !isPaused) {
        // If the page becomes visible AND the timer should be running (isPaused is false),
        // re-acquire the lock.
        console.log('Reacquiring Wake Lock after page became visible.');
        await requestWakeLock();
    }
};

// --- Utility Functions ---
function applyTheme(theme) {
    // No longer need themeIcon as we're setting textContent
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');

    // Remove the light-mode class by default (for dark theme)
    document.body.classList.remove('light-mode');

    if (theme === 'light') {
        // Light theme
        document.body.classList.add('light-mode');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = moonIconSVG; // Use SVG
            themeToggleBtn.setAttribute('aria-label', 'Switch to Dark Theme');
        }
        if (themeColorMeta) {
            themeColorMeta.content = '#ffffff'; // Light theme background color (or primary if preferred)
        }
    } else {
        // Dark theme (default)
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = sunIconSVG; // Use SVG
            themeToggleBtn.setAttribute('aria-label', 'Switch to Light Theme');
        }
        if (themeColorMeta) {
            themeColorMeta.content = '#000000'; // Dark theme background color
        }
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark'; // Toggle logic reversed
    localStorage.setItem('theme', currentTheme);
    applyTheme(currentTheme);
}

function updateTimeDisplay(minutes, seconds) {
    if (minutesDisplay && secondsDisplay) {
        minutesDisplay.textContent = String(minutes).padStart(2, '0');
        secondsDisplay.textContent = String(seconds).padStart(2, '0');
    }
}

function updateModeIndicator(session) {
    let modeText = 'Work';
    if (session === 'break') modeText = 'Break';
    else if (session === 'longBreak') modeText = 'Long Break';

    if (modeIndicator) {
        modeIndicator.textContent = modeText;
    }
    // Update document title to reflect timer state
    if (minutesDisplay && secondsDisplay) {
        document.title = `${minutesDisplay.textContent}:${secondsDisplay.textContent} - ${modeText}`;
    }
}

function updateProgressBar(percent) {
    const circleElement = progressCircle || document.querySelector('.progress-ring__circle');
    if (!circleElement || circumference === 0) return; // Ensure circle is ready

    const clampedPercent = Math.max(0, Math.min(100, percent)); // Keep percent between 0-100
    const offset = circumference - (clampedPercent / 100) * circumference;
    circleElement.style.strokeDashoffset = offset;
}


function updateStatsDisplay() {
    let displayText = '';
    if (currentSession === 'work') {
        // Show total gross work time accumulated in this run
        const totalWorkMinutes = Math.floor(grossWorkTimeAccumulated / 60);
        const totalWorkSeconds = grossWorkTimeAccumulated % 60;
        const totalWorkText = `${String(totalWorkMinutes).padStart(2, '0')}:${String(totalWorkSeconds).padStart(2, '0')}`;
        displayText = `Total Work: ${totalWorkText}`;
    } else {
        // Show earned break time based on net work time
        const isNegative = totalWorkTimeElapsed < 0; // Can happen if break exceeds earned time
        const absoluteWorkElapsed = Math.abs(totalWorkTimeElapsed);
        let earnedBreakSeconds = 0;
        if (workRatio > 0 && absoluteWorkElapsed > 0) {
            earnedBreakSeconds = Math.floor((absoluteWorkElapsed * breakRatio) / workRatio);
        }
        const earnedMinutes = Math.floor(earnedBreakSeconds / 60);
        const earnedSecs = earnedBreakSeconds % 60;
        const sign = isNegative && earnedBreakSeconds > 0 ? "-" : ""; // Show negative if needed
        const earnedBreakText = earnedBreakSeconds === 0
            ? `00:00`
            : `${sign}${String(earnedMinutes).padStart(2, '0')}:${String(earnedSecs).padStart(2, '0')}`;
        displayText = `Earned Rest: ${earnedBreakText}`;
    }
    if (mainStatDisplay) {
        mainStatDisplay.textContent = displayText;
    }
}

function updateButtonStates() {
    // Update text content instead of icon classes
    if (mainActionBtn) {
        if (isPaused) {
            mainActionBtn.innerHTML = playIconSVG; // Use SVG
            mainActionBtn.setAttribute('aria-label', 'Start Work');
        } else { // Timer is running
            if (currentSession === 'longBreak') {
                mainActionBtn.innerHTML = playIconSVG; // Use SVG
                mainActionBtn.setAttribute('aria-label', 'Start Work');
            } else {
                mainActionBtn.innerHTML = pauseIconSVG; // Use SVG
                mainActionBtn.setAttribute('aria-label', currentSession === 'work' ? 'Start Break' : 'Resume Work');
            }
        }
    }

    if (longBreakResetBtn) {
        // Update innerHTML with SVG code
        if (currentSession === 'longBreak') {
            // During long break, this button resets the timer
            longBreakResetBtn.innerHTML = resetIconSVG; // Use SVG
            longBreakResetBtn.setAttribute('aria-label', 'Reset Timer');
        } else {
            // Otherwise, it starts a long break
            longBreakResetBtn.innerHTML = bedIconSVG; // Use SVG
            longBreakResetBtn.setAttribute('aria-label', 'Start Long Break');
        }
    }
}


// --- Core Timer Logic ---
function startTimer() {
    if (!isPaused) return; // Prevent multiple intervals

    // Ensure breaks have a valid duration before starting
    if (currentSession !== 'work' && (!totalSessionDuration || totalSessionDuration <= 0)) {
        console.warn(`Timer start attempted for ${currentSession} with invalid duration. Recalculating.`);
        // Pass false when recalculating break duration to avoid resetting work time accidentally
        setTimeForSession(currentSession, false);
        if (!totalSessionDuration || totalSessionDuration <= 0) {
            console.error(`Cannot start ${currentSession} timer, duration is zero or invalid.`);
            isPaused = true; // Remain paused
            updateButtonStates();
            return; // Exit if still invalid
        }
    }

    isPaused = false;
    requestWakeLock(); // Request wake lock when timer starts
    updateButtonStates();
    clearInterval(timerInterval); // Clear any lingering intervals
    timerInterval = null;

    timerInterval = setInterval(() => {
        if (isPaused) { // Double-check pause state within interval
            clearInterval(timerInterval);
            timerInterval = null;
            return;
        }

        // Update time elapsed/accumulated based on session
        if (currentSession === 'work') {
            totalWorkTimeElapsed++; // Net time
            grossWorkTimeAccumulated++; // Time spent *in* work mode
        } else if (currentSession === 'break' || currentSession === 'longBreak') {
            // Decrease 'earned' time (totalWorkTimeElapsed) based on work:break ratio
            const workCostPerSecond = (workRatio > 0 && breakRatio > 0) ? workRatio / breakRatio : 0;
            if (workCostPerSecond > 0 && timeLeft > 0) {
                totalWorkTimeElapsed = totalWorkTimeElapsed - workCostPerSecond;
            }
        }

        timeLeft--; // Decrement time remaining for the current session

        let displayMinutes, displaySeconds;
        let percentElapsed = 0;

        // Calculate display time and progress based on session type
        if (currentSession === 'work') {
            if (timeLeft >= 0) { // Normal work time
                displayMinutes = Math.floor(timeLeft / 60);
                displaySeconds = timeLeft % 60;
                if (totalSessionDuration > 0) {
                    percentElapsed = ((totalSessionDuration - timeLeft) / totalSessionDuration) * 100;
                }
            } else { // Work overtime
                const overtimeSeconds = Math.abs(timeLeft);
                const baseWorkSeconds = totalSessionDuration;
                const totalSecondsSinceStart = baseWorkSeconds + overtimeSeconds;
                displayMinutes = Math.floor(totalSecondsSinceStart / 60);
                displaySeconds = totalSecondsSinceStart % 60;
                percentElapsed = 100; // Show progress as full during overtime
            }
        } else { // Break or Long Break
            // Display time remaining, ensuring it doesn't go below zero visually
            displayMinutes = Math.floor(Math.max(0, timeLeft) / 60);
            displaySeconds = Math.max(0, timeLeft) % 60;
            if (totalSessionDuration > 0) {
                percentElapsed = ((totalSessionDuration - Math.max(0, timeLeft)) / totalSessionDuration) * 100;
            }
        }

        // Update UI elements
        updateTimeDisplay(displayMinutes, displaySeconds);
        updateProgressBar(percentElapsed);
        updateModeIndicator(currentSession);
        updateStatsDisplay();

        // Check if break/long break session has ended
        if (currentSession !== 'work' && timeLeft < 0) {
            clearInterval(timerInterval);
            releaseWakeLock(); // Release wake lock when timer stops automatically
            timerInterval = null;
            isPaused = true; // Pause automatically when break ends
            updateProgressBar(100); // Ensure progress bar is full
            updateTimeDisplay(0, 0); // Show 00:00 for ended break
            updateStatsDisplay();
            updateButtonStates();
            updateModeIndicator(currentSession);
            // User must manually start next work session
        }
    }, 1000);
}

function pauseTimer() {
    if (isPaused) return;
    releaseWakeLock(); // Release wake lock when timer is paused
    isPaused = true;
    updateButtonStates();
    clearInterval(timerInterval);
    timerInterval = null;
    // console.log("Timer Paused");
    // Update title to show paused state
    if (minutesDisplay && secondsDisplay && modeIndicator) {
        document.title = `(Paused) ${minutesDisplay.textContent}:${secondsDisplay.textContent} - ${modeIndicator.textContent}`;
    }
}


function handleMainActionClick() {
    // --- Special handling for Long Break ---
    if (currentSession === 'longBreak') {
        // Reset gross work time when starting work after a long break
        setTimeForSession('work', true);
        startTimer();
        return;
    }
    // --- END: Special handling for Long Break ---


    // --- Existing logic for Work/Break sessions ---
    if (isPaused) {
        if (currentSession === 'break' && timeLeft > 0) {
            // If paused during a break, resume the break
            startTimer();
        } else {
            // This is where work starts after a short break ends OR if work was paused
            if (currentSession === 'break' || timeLeft < 0) {
                // Pass false to prevent resetting gross work time after short break ends
                setTimeForSession('work', false);
            }
            // If work was just paused (timeLeft >= 0), we don't call setTimeForSession,
            // so grossWorkTimeAccumulated is preserved naturally.
            startTimer(); // Start/resume work
        }
    } else { // Timer is running
        if (currentSession === 'work') {
            // Running work: Just set up and start the break. NO redirection here.
            releaseWakeLock(); // Release lock before starting break

            // 1. Set up the break state (pass false to avoid resetting work time)
            setTimeForSession('break', false);

            // 2. Start the break timer if there's duration
            if (totalSessionDuration > 0) {
                startTimer(); // Start the break countdown
            } else {
                // console.log("No earned break time. Pausing.");
                // setTimeForSession already paused it
            }

        } else if (currentSession === 'break') {
            // Running normal break: Stop break, switch to work, start work.
            // console.log("Interrupting break to resume work.");
            // Switch to work session, pass false to keep accumulated work time
            setTimeForSession('work', false);
            // Start the work timer
            startTimer();
        }
        // No 'else' needed as long break running case is handled at the top
    }
}


function handleLongBreakResetClick() {
    if (currentSession === 'longBreak') {
        releaseWakeLock(); // Release lock before resetting
        // If currently in a long break (running or paused), reset the whole timer
        resetTimer();
    } else {
        releaseWakeLock(); // Release lock before starting long break
        // If in work or normal break, switch to long break mode AND redirect

        const taskSelectEl = document.getElementById('taskSelection');
        const selectedTaskId = taskSelectEl ? taskSelectEl.value : null;
        // Use grossWorkTimeAccumulated (work time since last long break/reset) for the duration sent to LifeUp
        const workDurationSeconds = Math.floor(grossWorkTimeAccumulated);

        // --- ADDED CHECK ---
        // Check if the duration is sufficient before proceeding
        if (workDurationSeconds < MIN_LOGGABLE_WORK_SECONDS) {
            //console.error(`Work session too short (${workDurationSeconds}s). Minimum ${MIN_LOGGABLE_WORK_SECONDS}s required to log.`);
            // Optionally, provide user feedback (e.g., alert or update a status message)
            showToast(`Work session too short (${workDurationSeconds}s). Min ${MIN_LOGGABLE_WORK_SECONDS}s.`, "error");
            // Still start the long break, just don't log it
            setTimeForSession('longBreak', true); // Reset work time for next cycle
            startTimer(); // Start the long break countdown
            return; // Stop before redirection logic
        }
        // --- END ADDED CHECK ---


        // 1. Set up the long break state (pass true to reset work time for next cycle)
        setTimeForSession('longBreak', true);

        // 2. Start the long break timer
        startTimer(); // Start the long break countdown

        // 3. Redirect to LifeUp *after* a short delay, if task selected
        if (selectedTaskId && selectedTaskId !== "") {
            // Use workDurationSeconds here (already validated >= MIN_LOGGABLE_WORK_SECONDS)
            // http://{host:port}/api/contentprovider?url=OUR_ENCODED_API_URL_1
            let lifeupUrl = `lifeup://api/add_pomodoro?task_id=${selectedTaskId}&duration=${workDurationSeconds * 1000}&reward_tomatoes=true`;
            let encodedLifeupUrl = encodeURIComponent(lifeupUrl);
            console.log("Encoded LifeUp URL:", encodedLifeupUrl);
            const lifeupUrlEncoded = `${getBaseUrl()}/api/contentprovider?url=${encodedLifeupUrl}`;
            // console.log("Setting up redirection to LifeUp (Long Break):", lifeupUrl);

            // Perform background request to LifeUp
            console.log("Attempting background fetch to:", lifeupUrlEncoded);
            fetch(lifeupUrlEncoded)
                .then(response => {
                    console.log("Fetch response status:", response.status);
                    if (response.ok) {
                        showToast("Pomodoro logged to LifeUp!", "success");
                    } else {
                        console.error("LifeUp Log Error:", response.statusText);
                        showToast("Failed to log to LifeUp: " + response.status, "error");
                    }
                })
                .catch(err => {
                    console.error("LifeUp Log Error:", err);
                    showToast("Network error logging to LifeUp.", "error");
                });

        } else {
            console.warn("No task selected. Skipping redirection for Long Break.");
            // Long break timer was already started above
        }
    }
}

function resetTimer() {
    releaseWakeLock(); // Ensure lock is released on full reset
    pauseTimer();
    currentSession = 'work';
    readSettings();
    totalWorkTimeElapsed = 0;
    // grossWorkTimeAccumulated is reset by setTimeForSession below
    // Pass true to reset gross work time on manual reset
    setTimeForSession(currentSession, true);
    // console.log("Timer Reset");
}

/**
 * Sets the timer display and duration based on the target session type.
 * @param {string} session - The target session type ('work', 'break', 'longBreak').
 * @param {boolean} [resetGrossWork=true] - Whether to reset the gross accumulated work time (used for 'Total Work' display).
 */
function setTimeForSession(session, resetGrossWork = true) {
    pauseTimer(); // Always pause before changing session state
    currentSession = session;
    updateModeIndicator(session);
    readSettings(); // Ensure latest settings are used for duration calculation

    if (session === 'work') {
        // use Active Stack Task duration if available, else global setting
        let durationMinutes = initialWorkTime || DEFAULT_WORK_TIME;

        if (activeStackTask && activeStackTask.duration) {
            durationMinutes = activeStackTask.duration;
        }

        totalSessionDuration = durationMinutes * 60;
        timeLeft = totalSessionDuration;
        // Only reset if requested (default is true)
        if (resetGrossWork) {
            grossWorkTimeAccumulated = 0; // Reset gross work time
            // console.log("Resetting grossWorkTimeAccumulated");
        } else {
            // console.log("NOT resetting grossWorkTimeAccumulated");
        }

    } else if (session === 'break') {
        const configuredBreakMinutes = breakTimeInput ? (parseInt(breakTimeInput.value) || DEFAULT_BREAK_TIME) : DEFAULT_BREAK_TIME;
        const configuredBreakSeconds = configuredBreakMinutes * 60;
        let currentEarnedSeconds = 0;
        if (workRatio > 0 && totalWorkTimeElapsed > 0) {
            currentEarnedSeconds = Math.floor((totalWorkTimeElapsed * breakRatio) / workRatio);
        }
        totalSessionDuration = Math.min(Math.max(0, currentEarnedSeconds), configuredBreakSeconds);
        timeLeft = totalSessionDuration;

    } else if (session === 'longBreak') {
        const longBreakMinutes = longBreakTimeInput ? (parseInt(longBreakTimeInput.value) || DEFAULT_LONG_BREAK_TIME) : DEFAULT_LONG_BREAK_TIME;
        totalSessionDuration = longBreakMinutes * 60;
        timeLeft = totalSessionDuration;

    } else { // Fallback
        console.error("Invalid session type:", session);
        currentSession = 'work';
        totalSessionDuration = (initialWorkTime || DEFAULT_WORK_TIME) * 60;
        timeLeft = totalSessionDuration;
        // Reset here too for safety in fallback case
        grossWorkTimeAccumulated = 0;
    }

    // Update UI elements for the new session state
    const minutes = Math.floor(Math.max(0, timeLeft) / 60);
    const seconds = Math.max(0, timeLeft) % 60;
    updateTimeDisplay(minutes, seconds);
    updateProgressBar(0); // Reset progress bar
    updateStatsDisplay();
    updateButtonStates();
    updateModeIndicator(session);
}

// --- Task Stack Logic ---

function addToStack() {
    const categorySelect = document.getElementById('taskCategory');
    const taskSelect = document.getElementById('taskSelection');

    if (!categorySelect || !taskSelect) return;

    const categoryId = categorySelect.value;
    const taskId = taskSelect.value;

    if (!categoryId || !taskId) {
        // Optionally show simple feedback like shaking the button or a toast
        return;
    }

    const taskName = taskSelect.options[taskSelect.selectedIndex].text;
    const categoryName = categorySelect.options[categorySelect.selectedIndex].text;

    // Get color from dataset if available (set in apiService.js)
    const categoryColor = categorySelect.options[categorySelect.selectedIndex].dataset.color || '#6366f1';

    // Get current global work time as default for new task
    const currentGlobalWorkTime = workTimeInput ? (parseInt(workTimeInput.value) || DEFAULT_WORK_TIME) : DEFAULT_WORK_TIME;

    const newTask = {
        id: taskId, // LifeUp Task ID
        name: taskName,
        categoryId: categoryId,
        categoryName: categoryName,
        color: categoryColor,
        uniqueId: Date.now(), // For frontend keying
        duration: currentGlobalWorkTime // Initialize with current global setting
    };

    taskStack.push(newTask);
    renderStack();
}

function removeFromStack(uniqueId) {
    taskStack = taskStack.filter(t => t.uniqueId !== uniqueId);
    renderStack();
}

function shuffleStack() {
    for (let i = taskStack.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [taskStack[i], taskStack[j]] = [taskStack[j], taskStack[i]];
    }
    renderStack();
}

function renderStack() {
    const listContainer = document.getElementById('taskStackList');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (taskStack.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-stack-placeholder">
                Add tasks to build your stack
            </div>
        `;
        return;
    }

    taskStack.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.style.borderLeftColor = task.color; // Use category color
        card.setAttribute('draggable', 'true'); // Enable drag (attribute)
        card.dataset.id = String(task.uniqueId); // Identify for state update

        // Inline SVG for Play (Start)
        const playSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>`;

        // Inline SVG for X (Remove)
        const removeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>`;

        // Determine Button State
        let isFocused = false;
        if (activeStackTask && task.uniqueId === activeStackTask.uniqueId) {
            isFocused = true;
        }

        const buttonText = isFocused ? 'FOCUS' : 'START';
        const buttonIcon = isFocused ? clockIconSVG : playSvg;
        const buttonClass = isFocused ? 'task-start-btn active-focus' : 'task-start-btn';

        card.innerHTML = `
            <div class="task-info">
                <div class="task-name" title="${task.name}">${task.name}</div>
                <div class="task-meta">
                   <span>FOCUS</span>
                   <input type="number" class="task-duration-input" value="${task.duration}" min="1" max="180" data-id="${task.uniqueId}" aria-label="Task Duration in Minutes">
                   <span>min</span>
                </div>
            </div>
            <div class="task-actions">
                 <button class="${buttonClass}" aria-label="${buttonText} Task">
                    ${buttonIcon} ${buttonText}
                 </button>
                 <button class="task-remove-btn icon-button" aria-label="Remove Task" style="padding: 4px;">
                     ${removeSvg}
                 </button>
            </div>
        `;

        // Attach Listeners
        const startBtn = card.querySelector('.task-start-btn');
        startBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid triggering card click if we had one
            startTaskFromStack(task);
        });

        const removeBtn = card.querySelector('.task-remove-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromStack(task.uniqueId);
        });

        // Duration Input Listener
        const durationInput = card.querySelector('.task-duration-input');
        durationInput.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click
        });
        durationInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            if (val && val > 0) {
                task.duration = val;
                // If this is the active task, update the timer ONLY if we are in PLANNING/stopped state?
                // Actually, if user changes duration mid-task, we probably shouldn't change the running timer immediately
                // to avoid jumping. But if they reset and start again, it should take effect.
                // We don't need to do anything else here other than update the model.
            }
        });
        durationInput.addEventListener('change', (e) => {
            // Ensure valid value on blur/enter
            let val = parseInt(e.target.value);
            if (!val || val < 1) {
                val = DEFAULT_WORK_TIME;
                task.duration = val;
                e.target.value = val;
            }
        });

        // Drag Events
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', task.uniqueId); // Required for Firefox
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            // Re-build stack array from DOM order
            updateStackFromDOM();
            updateTaskStatusDisplay();
        });

        listContainer.appendChild(card);
    });

    updateTaskStatusDisplay(); // Update display whenever stack renders
}

// Helper to update state after drag
function updateStackFromDOM() {
    const listContainer = document.getElementById('taskStackList');
    if (!listContainer) return;

    const cards = [...listContainer.querySelectorAll('.task-card')];
    const newStack = [];

    cards.forEach(card => {
        const uniqueId = parseInt(card.dataset.id, 10);
        const task = taskStack.find(t => t.uniqueId === uniqueId);
        if (task) {
            newStack.push(task);
        }
    });

    taskStack = newStack;
}

// Helper for Drag Position
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function startTaskFromStack(task) {
    const categorySelect = document.getElementById('taskCategory');
    const taskSelect = document.getElementById('taskSelection');

    if (categorySelect && taskSelect) {
        // 1. Set Category
        categorySelect.value = task.categoryId;
        // Trigger change event to load tasks
        const event = new Event('change');
        categorySelect.dispatchEvent(event);

        // 2. Load tasks and start
        loadTasksForCategory(task.categoryId, taskSelect).then(() => {
            taskSelect.value = task.id;

            // Set active task tracking
            activeStackTask = task;
            updateTaskStatusDisplay();
            renderStack(); // Update UI to show FOCUS button

            // Toggle sidebar closed on mobile/desktop if open
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');

            // Only close sidebar on mobile (viewport <= 900px)
            if (window.innerWidth <= 900) {
                if (sidebar && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    if (overlay) overlay.classList.remove('active');
                }
            }

            // 3. Start Timer (Work Mode)
            // Always set time for session to ensure the duration from the specific task is applied
            setTimeForSession('work', true);
            startTimer();
        });
    }
}

function updateTaskStatusDisplay() {
    const currentTaskEl = document.getElementById('currentTaskDisplay');
    const nextTaskEl = document.getElementById('nextTaskDisplay');
    const addBtn = document.getElementById('openStackPromptBtn');

    if (!currentTaskEl || !nextTaskEl || !addBtn) return;

    // Determine Current Task Name
    let currentName = '';
    if (activeStackTask) {
        currentName = activeStackTask.name;
    } else {
        // Fallback to dropdown
        const taskSelect = document.getElementById('taskSelection');
        if (taskSelect && taskSelect.value && taskSelect.selectedIndex > 0) {
            currentName = taskSelect.options[taskSelect.selectedIndex].text;
        }
    }

    if (currentName) {
        currentTaskEl.innerHTML = `Running: <span>${currentName}</span>`;
    } else {
        currentTaskEl.innerHTML = 'Ready to <span>Focus</span>';
    }

    // Determine Next Task
    let nextName = '';

    if (taskStack.length > 0) {
        if (activeStackTask) {
            const idx = taskStack.findIndex(t => t.uniqueId === activeStackTask.uniqueId);
            if (idx !== -1 && idx + 1 < taskStack.length) {
                nextName = taskStack[idx + 1].name;
            } else if (idx !== -1 && taskStack.length > 1) {
                // End of stack, but multiple items -> Cycle to top
                nextName = taskStack[0].name;
            } else {
                // Single item or empty or active not found -> Empty or fallback
                nextName = '';
            }
        } else {
            // No active task, next is top of stack
            // BUT: If there's only 1 task and it's already running (via dropdown logic), we shouldn't show it as next?
            // Since we don't know for sure if it's running without activeStackTask, we'll just show it unless user manually started it elsewhere.
            // Actually, if stack has only 1 item, "Up Next" is redundant if that item is the focus.
            if (taskStack.length > 1) {
                nextName = taskStack[0].name;
            } else {
                nextName = '';
            }
        }
    }

    if (nextName) {
        nextTaskEl.textContent = `Up Next: ${nextName}`;
        addBtn.classList.add('hidden');
    } else {
        nextTaskEl.textContent = '';
        addBtn.classList.remove('hidden');
    }
}


function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger reflow for transition
    void toast.offsetWidth;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300); // Wait for fade out
    }, 3000); // Show for 3 seconds
}

// --- Settings Logic ---
function readSettings() {
    // Read values from input fields, using defaults if invalid
    initialWorkTime = workTimeInput ? (parseInt(workTimeInput.value) || DEFAULT_WORK_TIME) : DEFAULT_WORK_TIME;
    const newWorkRatio = workRatioInput ? (parseInt(workRatioInput.value) || DEFAULT_WORK_RATIO) : DEFAULT_WORK_RATIO;

    // Save Server URL
    if (serverUrlInput) {
        let rawUrl = serverUrlInput.value.trim();

        if (rawUrl) {
            // Security: Prevent javascript: or data: schemes
            if (/^\s*(javascript:|data:)/i.test(rawUrl)) {
                showToast('Invalid URL: Unsafe scheme detected.', 'error');
                serverUrlInput.value = localStorage.getItem('lifeup_server_url') || DEFAULT_API_URL;
                return;
            }

            // Check if it already has a protocol
            const protocolMatch = rawUrl.match(/^([a-z0-9\+\-\.]+):\/\//i);

            if (protocolMatch) {
                // If it has a protocol, it MUST be http or https
                const protocol = protocolMatch[1].toLowerCase();
                if (protocol !== 'http' && protocol !== 'https') {
                    showToast('Invalid Protocol: Only HTTP and HTTPS are allowed.', 'error');
                    return;
                }
            } else {
                // No protocol found, prepend http://
                rawUrl = 'http://' + rawUrl;
            }

            // Validation: Check if it's a valid URL format
            try {
                const urlObj = new URL(rawUrl);
                // Double check protocol just in case
                if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                    throw new Error('Protocol must be http or https');
                }

                localStorage.setItem('lifeup_server_url', urlObj.href);
            } catch (e) {
                console.warn("Invalid URL entered:", e);
                showToast('Invalid URL format. Please check and try again.', 'error');
                // Don't save invalid URL, keep old one in storage (UI might still show invalid input until reload/cancel)
                return;
            }
        }
    }

    // Validate work ratio
    if (newWorkRatio > 0) {
        workRatio = newWorkRatio;
    } else {
        console.warn("Invalid work ratio input. Using default or previous value.");
        if (workRatioInput) workRatioInput.value = workRatio || DEFAULT_WORK_RATIO; // Reset input field
        workRatio = workRatio || DEFAULT_WORK_RATIO; // Ensure state variable is valid
    }

    // Ensure input fields reflect the actual values being used
    if (workTimeInput) workTimeInput.value = initialWorkTime;
    if (breakTimeInput) breakTimeInput.value = breakTimeInput.value || DEFAULT_BREAK_TIME;
    if (longBreakTimeInput) longBreakTimeInput.value = longBreakTimeInput.value || DEFAULT_LONG_BREAK_TIME;
    if (workRatioInput) workRatioInput.value = workRatio;
}

function toggleSettingsPanel() {
    if (settingsPanel) {
        settingsPanel.classList.toggle('hidden');
    } else {
        console.error("Settings panel element not found when trying to toggle.");
    }
}


// --- Wait for DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
    // Calculate Progress Bar values now that element exists
    const progressCircleElement = progressCircle || document.querySelector('.progress-ring__circle');
    if (progressCircleElement) {
        radius = progressCircleElement.r.baseVal.value;
        circumference = 2 * Math.PI * radius;
        progressCircleElement.style.strokeDasharray = `${circumference} ${circumference}`;
        progressCircleElement.style.strokeDashoffset = circumference;
    } else {
        console.error("Progress circle element not found.");
    }

    // --- Event Listeners ---
    // Get element references *inside* DOMContentLoaded for listeners
    const mainActionBtnEl = document.getElementById('mainActionBtn');
    const longBreakResetBtnEl = document.getElementById('longBreakResetBtn');
    const themeToggleBtnEl = document.getElementById('themeToggleBtn');
    const settingsBtnEl = document.getElementById('settingsBtn');
    const applySettingsBtnEl = document.getElementById('applySettings');
    const settingsPanelEl = document.querySelector('.settings');
    const categorySelectEl = document.getElementById('taskCategory');
    const taskSelectEl = document.getElementById('taskSelection');

    // Attach listeners if elements exist
    if (mainActionBtnEl) mainActionBtnEl.addEventListener('click', handleMainActionClick);
    if (longBreakResetBtnEl) longBreakResetBtnEl.addEventListener('click', handleLongBreakResetClick);
    if (themeToggleBtnEl) themeToggleBtnEl.addEventListener('click', toggleTheme);
    if (settingsBtnEl) settingsBtnEl.addEventListener('click', toggleSettingsPanel);

    // Add listener for the optional close button inside settings
    const closeSettingsBtnEl = document.querySelector('.settings .close-settings-btn');
    if (closeSettingsBtnEl) {
        closeSettingsBtnEl.addEventListener('click', toggleSettingsPanel);
    }


    if (applySettingsBtnEl) {
        applySettingsBtnEl.addEventListener('click', () => {
            readSettings(); // Read and apply new settings
            // If timer is paused, update the display for the current session
            if (isPaused) {
                // Recalculate and display time, respecting the resetGrossWork logic for the current state
                // Reset gross work time only if not currently in a work session when applying settings
                setTimeForSession(currentSession, currentSession !== 'work');
            } else {
                // If timer is running, just update stats (earned time might change due to ratio)
                updateStatsDisplay();
            }
            if (settingsPanelEl) settingsPanelEl.classList.add('hidden'); // Close panel
        });
    }

    // Listener for category dropdown changes
    if (categorySelectEl && taskSelectEl) {
        categorySelectEl.addEventListener('change', (event) => {
            const selectedCategoryId = event.target.value;

            if (selectedCategoryId) {
                // Load tasks for the selected category
                loadTasksForCategory(selectedCategoryId, taskSelectEl);
            } else {
                // Reset task dropdown if default category is selected
                taskSelectEl.disabled = true;
                taskSelectEl.options[0].textContent = '--Select Task--';
                while (taskSelectEl.options.length > 1) {
                    taskSelectEl.remove(1);
                }
            }
        });
    } else {
        if (!categorySelectEl) console.error("Category select element not found for event listener.");
        if (!taskSelectEl) console.error("Task select element not found for event listener setup.");
    }

    // --- Initialize ---

    // Load Server URL from storage to input
    const storedUrl = localStorage.getItem('lifeup_server_url');
    if (serverUrlInput) {
        serverUrlInput.value = storedUrl || 'http://localhost:13276'; // Default
    }

    readSettings(); // Read initial settings from HTML/defaults
    applyTheme(currentTheme); // Apply saved or default theme

    // Load categories from API (will also reset task dropdown initially)
    if (categorySelectEl && taskSelectEl) {
        loadTaskCategories(categorySelectEl, taskSelectEl).then(success => {
            if (success) {
                showToast("Connected to LifeUp server", "success");
            }
        });
    } else {
        if (!categorySelectEl) console.error("Category select element not found for initial load.");
        if (!taskSelectEl) console.error("Task select element not found for initial load.");
    }

    // Set initial timer state to paused 'work' mode, reset gross work time on load
    setTimeForSession('work', true);

    // Initial UI updates
    updateButtonStates();
    updateStatsDisplay();

    // Ensure task dropdown is initially disabled
    if (taskSelectEl) {
        taskSelectEl.disabled = true;
    }

    // Add listeners for Wake Lock visibility and unload
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Listner for Add to Stack
    const addToStackBtn = document.getElementById('addToStackBtn');
    if (addToStackBtn) {
        addToStackBtn.addEventListener('click', addToStack);
    }

    // Drag and Drop Container Listeners
    const taskStackList = document.getElementById('taskStackList');
    if (taskStackList) {
        taskStackList.addEventListener('dragover', (e) => {
            e.preventDefault(); // Enable dropping
            const afterElement = getDragAfterElement(taskStackList, e.clientY);
            const draggable = document.querySelector('.dragging');
            if (draggable) {
                if (afterElement == null) {
                    taskStackList.appendChild(draggable);
                } else {
                    taskStackList.insertBefore(draggable, afterElement);
                }
            }
        });

        // Essential for some browsers to allow drop
        taskStackList.addEventListener('dragenter', (e) => e.preventDefault());
        taskStackList.addEventListener('drop', (e) => e.preventDefault());
    }

    // Listener for Shuffle Stack
    const shuffleStackBtn = document.getElementById('shuffleStackBtn');
    if (shuffleStackBtn) {
        shuffleStackBtn.addEventListener('click', shuffleStack);
    }



    // --- Stack Drawer Logic ---
    const stackToggleBtn = document.getElementById('stackToggleBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }

    if (stackToggleBtn) {
        stackToggleBtn.addEventListener('click', toggleSidebar);
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Initialize Sidebar State (Open on Desktop)
    if (window.innerWidth > 900) {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active'); // Consistent state, though hidden by CSS on desktop
        }
    }

    // Add Prompt Button Logic
    const openStackPromptBtn = document.getElementById('openStackPromptBtn');
    if (openStackPromptBtn) {
        openStackPromptBtn.addEventListener('click', toggleSidebar);
    }

    // Load stack (if we had persistence, which we can add later)
    renderStack();

    window.addEventListener('beforeunload', releaseWakeLock); // Release on unload as safeguard

    // Test Toast
    showToast("App Loaded");
}); // End of DOMContentLoaded listener
