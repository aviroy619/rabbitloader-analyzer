const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');
const sharp = require('sharp');
const { detectCustomScripts } = require('../detectors/scripts');

class PageComparator {
    async capturePage(url, delay = 3000, viewport = { width: 1920, height: 1080 }) {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        try {
            const page = await browser.newPage();

            // Set viewport size
            await page.setViewport({
                width: viewport.width,
                height: viewport.height
            });

            const errors = [];
            const consoleMessages = [];
            const networkErrors = [];

            page.on('error', err => errors.push(err.message));
            page.on('pageerror', err => errors.push(err.message));

            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleMessages.push(msg.text());
                }
            });

            page.on('requestfailed', request => {
                networkErrors.push({
                    url: request.url(),
                    failure: request.failure().errorText
                });
            });

            console.log('Loading: ' + url);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            console.log('Waiting ' + delay + 'ms before screenshot...');
            await new Promise(resolve => setTimeout(resolve, delay));

            const domSnapshot = await page.evaluate(() => {
                const captureElementDetails = () => {
                    const elements = [];
                    const allElements = document.querySelectorAll('button, form, input, img, h1, h2, h3, a, .btn, [class*="button"], [class*="cart"], [class*="checkout"]');

                    allElements.forEach((el, index) => {
                        const style = window.getComputedStyle(el);
                        const rect = el.getBoundingClientRect();

                        // Create unique selector
                        let selector = el.tagName.toLowerCase();
                        if (el.id) selector += '#' + el.id;
                        else if (el.className) selector += '.' + el.className.toString().split(' ')[0];

                        elements.push({
                            tag: el.tagName.toLowerCase(),
                            id: el.id || null,
                            class: el.className.toString() || null,
                            selector: selector,
                            text: el.innerText ? el.innerText.substring(0, 50) : '',

                            // Computed styles
                            display: style.display,
                            visibility: style.visibility,
                            opacity: style.opacity,
                            fontSize: style.fontSize,
                            color: style.color,
                            backgroundColor: style.backgroundColor,
                            width: style.width,
                            height: style.height,

                            // Position
                            x: Math.round(rect.left + window.scrollX),
                            y: Math.round(rect.top + window.scrollY),
                            rectWidth: Math.round(rect.width),
                            rectHeight: Math.round(rect.height),
                            visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',

                            // Images
                            isImg: el.tagName === 'IMG',
                            imgSrc: el.tagName === 'IMG' ? el.src : null,
                            imgLoaded: el.tagName === 'IMG' ? el.complete && el.naturalHeight !== 0 : null,

                            // Index for matching
                            index: index
                        });
                    });

                    return elements.filter(el => el.rectWidth > 10 && el.rectHeight > 10);
                };

                return {
                    title: document.title,
                    bodyHTML: document.body.innerHTML.substring(0, 10000),
                    elementCount: document.querySelectorAll('*').length,
                    formCount: document.querySelectorAll('form').length,
                    buttonCount: document.querySelectorAll('button').length,
                    inputCount: document.querySelectorAll('input').length,
                    images: document.querySelectorAll('img').length,
                    elementDetails: captureElementDetails()
                };
            });

            const fullHtml = await page.content();
            const screenshotPath = path.join(__dirname, '../output/screenshot-' + Date.now() + '.png');
            await page.screenshot({ path: screenshotPath });

            await browser.close();

            return {
                success: true,
                errors: errors,
                consoleErrors: consoleMessages,
                networkErrors: networkErrors,
                dom: domSnapshot,
                fullHtml: fullHtml,
                screenshot: screenshotPath
            };

        } catch (err) {
            if (browser) await browser.close();
            return {
                success: false,
                error: err.message
            };
        }
    }

    compareImages(beforePath, afterPath) {
        try {
            const img1 = PNG.sync.read(fs.readFileSync(beforePath));
            const img2 = PNG.sync.read(fs.readFileSync(afterPath));

            const w = Math.min(img1.width, img2.width);
            const h = Math.min(img1.height, img2.height);
            const diff = new PNG({ width: w, height: h });

            const pixelsChanged = pixelmatch(
                img1.data,
                img2.data,
                diff.data,
                w,
                h,
                { threshold: 0.1 }
            );

            const percentChanged = (pixelsChanged / (w * h)) * 100;

            return {
                success: true,
                pixelsChanged,
                percentChanged: parseFloat(percentChanged.toFixed(2)),
                totalPixels: w * h,
                status: percentChanged > 5 ? 'VISUAL_BREAK' : 'OK'
            };
        } catch (err) {
            console.error('Image comparison error:', err.message);
            return {
                success: false,
                error: err.message,
                percentChanged: 0,
                status: 'ERROR'
            };
        }
    }

    async comparePages(beforeUrl, afterUrl, delays = [3000], viewport = { width: 1920, height: 1080 }) {
        console.log('\nViewport: ' + viewport.width + 'x' + viewport.height + ', Delays: ' + delays.join(', ') + 'ms');
        console.log('Comparing: ' + beforeUrl + ' vs ' + afterUrl);

        const before = await this.capturePage(beforeUrl, delays[0], viewport);
        if (!before.success) {
            return { status: 'failed', error: 'Failed to capture before: ' + before.error };
        }

        // Capture multiple "after" screenshots at different delays
        const afterCaptures = [];
        for (let i = 0; i < delays.length; i++) {
            console.log('Capturing after screenshot ' + (i + 1) + ' at ' + delays[i] + 'ms...');
            const afterCapture = await this.capturePage(afterUrl, delays[i], viewport);
            if (!afterCapture.success) {
                return { status: 'failed', error: 'Failed to capture after at ' + delays[i] + 'ms: ' + afterCapture.error };
            }
            afterCaptures.push({
                delay: delays[i],
                capture: afterCapture
            });
        }

        // Use the first after capture for primary comparison
        const primaryAfter = afterCaptures[0].capture;

        // Visual comparison with primary after
        console.log('Comparing visuals...');
        const visualComparison = this.compareImages(before.screenshot, primaryAfter.screenshot);

        // Find changed elements
        console.log('Detecting element changes...');
        const changedElements = this.findChangedElements(
            before.dom.elementDetails || [],
            primaryAfter.dom.elementDetails || []
        );

        // Analyze detailed issues
        console.log('Analyzing detailed issues...');
        const detailedIssues = this.analyzeElementChanges(
            primaryAfter.dom.elementDetails || []
        );

        // Detect scripts in after HTML
        if (primaryAfter.fullHtml) {
            console.log('Detecting custom scripts...');
            const scripts = detectCustomScripts(primaryAfter.fullHtml);
            scripts.forEach(script => {
                detailedIssues.push({
                    type: 'RISKY_SCRIPT',
                    severity: script.risk === 'HIGH' ? 'CRITICAL' : 'MEDIUM',
                    element: 'script',
                    tag: 'script',
                    detail: `Found ${script.type} script: ${script.src || 'inline'}`,
                    script: script.src, // Path for dashboard
                    before: null,
                    after: { src: script.src }
                });
            });
        }


        // Generate highlighted screenshot if there are changes
        let highlightedScreenshot = null;
        if (changedElements.length > 0) {
            console.log(`Found ${changedElements.length} changed elements, generating highlighted screenshot...`);
            highlightedScreenshot = await this.highlightChanges(
                primaryAfter.screenshot,
                changedElements,
                viewport
            );
        }

        const differences = {
            newErrors: primaryAfter.errors.filter(err => !before.errors.includes(err)),
            newConsoleErrors: primaryAfter.consoleErrors.filter(msg => !before.consoleErrors.includes(msg)),
            newNetworkErrors: primaryAfter.networkErrors.filter(ne => !before.networkErrors.find(be => be.url === ne.url)),
            domChanges: {
                elementCountChanged: primaryAfter.dom.elementCount !== before.dom.elementCount,
                elementCountDiff: primaryAfter.dom.elementCount - before.dom.elementCount,
                formsChanged: primaryAfter.dom.formCount !== before.dom.formCount,
                formsDiff: primaryAfter.dom.formCount - before.dom.formCount,
                buttonsChanged: primaryAfter.dom.buttonCount !== before.dom.buttonCount,
                buttonsDiff: primaryAfter.dom.buttonCount - before.dom.buttonCount,
                inputsChanged: primaryAfter.dom.inputCount !== before.dom.inputCount,
                inputsDiff: primaryAfter.dom.inputCount - before.dom.inputCount,
                imagesChanged: primaryAfter.dom.images !== before.dom.images,
                imagesDiff: primaryAfter.dom.images - before.dom.images
            }
        };

        const isBroken =
            differences.newErrors.length > 0 ||
            differences.newConsoleErrors.length > 0 ||
            differences.domChanges.elementCountChanged ||
            differences.domChanges.formsChanged ||
            differences.domChanges.inputsChanged ||
            visualComparison.status === 'VISUAL_BREAK';

        // Determine status level
        let statusLevel = 'SAFE';
        if (visualComparison.percentChanged > 5 || differences.newErrors.length > 0 || Math.abs(differences.domChanges.elementCountDiff) > 20) {
            statusLevel = 'BROKEN';
        } else if (visualComparison.percentChanged > 2 || differences.newConsoleErrors.length > 0 || Math.abs(differences.domChanges.buttonsDiff) > 0) {
            statusLevel = 'WARNING';
        }

        return {
            status: 'compared',
            isBroken: isBroken,
            statusLevel: statusLevel,
            recommendation: isBroken ? 'BROKEN' : 'SAFE',
            differences: differences,
            visual: {
                percentChanged: visualComparison.percentChanged,
                status: visualComparison.status,
                pixelsChanged: visualComparison.pixelsChanged
            },
            screenshots: {
                before: '/output/' + path.basename(before.screenshot),
                after: afterCaptures.map(ac => ({
                    delay: ac.delay,
                    url: '/output/' + path.basename(ac.capture.screenshot)
                })),
                highlighted: highlightedScreenshot ? '/output/' + path.basename(highlightedScreenshot) : null,
                changedElementsCount: changedElements.length
            },
            delays: delays,
            viewport: viewport,
            before: {
                errors: before.errors.length,
                consoleErrors: before.consoleErrors.length,
                networkErrors: before.networkErrors.length,
                elements: before.dom.elementCount,
                forms: before.dom.formCount,
                buttons: before.dom.buttonCount,
                inputs: before.dom.inputCount,
                images: before.dom.images,
                errorDetails: before.errors
            },
            after: {
                errors: primaryAfter.errors.length,
                consoleErrors: primaryAfter.consoleErrors.length,
                networkErrors: primaryAfter.networkErrors.length,
                elements: primaryAfter.dom.elementCount,
                forms: primaryAfter.dom.formCount,
                buttons: primaryAfter.dom.buttonCount,
                inputs: primaryAfter.dom.inputCount,
                images: primaryAfter.dom.images,
                errorDetails: primaryAfter.errors
            },
            errors: {
                javascript: differences.newErrors,
                console: differences.newConsoleErrors,
                network: differences.newNetworkErrors.map(ne => ({
                    url: ne.url,
                    error: ne.failure
                }))
            },
            detailedIssues: detailedIssues,
            issuesSummary: {
                total: detailedIssues.length,
                critical: detailedIssues.filter(i => i.severity === 'CRITICAL').length,
                high: detailedIssues.filter(i => i.severity === 'HIGH').length,
                medium: detailedIssues.filter(i => i.severity === 'MEDIUM').length,
                low: detailedIssues.filter(i => i.severity === 'LOW').length
            },
            allAfterCaptures: afterCaptures.map(ac => ({
                delay: ac.delay,
                errors: ac.capture.errors.length,
                consoleErrors: ac.capture.consoleErrors.length,
                elements: ac.capture.dom.elementCount
            }))
        };
    }

    async highlightChanges(screenshotPath, changedElements, viewport) {
        try {
            if (!changedElements || changedElements.length === 0) {
                return screenshotPath; // No changes to highlight
            }

            // Create SVG overlay with red boxes
            const svgOverlay = `
                <svg width="${viewport.width}" height="${viewport.height}">
                    ${changedElements.map(el => `
                        <rect 
                            x="${el.x}" 
                            y="${el.y}" 
                            width="${el.width}" 
                            height="${el.height}" 
                            fill="red" 
                            opacity="0.3" 
                            stroke="red" 
                            stroke-width="3"
                        />
                        <text 
                            x="${el.x + 5}" 
                            y="${el.y + 20}" 
                            fill="white" 
                            font-size="14" 
                            font-weight="bold"
                            stroke="black"
                            stroke-width="1"
                        >
                            ${el.tag.toUpperCase()}
                        </text>
                    `).join('')}
                </svg>
            `;

            const highlightedPath = screenshotPath.replace('.png', '-highlighted.png');

            await sharp(screenshotPath)
                .composite([{
                    input: Buffer.from(svgOverlay),
                    top: 0,
                    left: 0
                }])
                .toFile(highlightedPath);

            return highlightedPath;
        } catch (err) {
            console.error('Error highlighting changes:', err.message);
            return screenshotPath; // Return original if highlighting fails
        }
    }

    analyzeElementChanges(beforeDetails, afterDetails) {
        const issues = [];
        const beforeElements = beforeDetails || [];
        const afterElements = afterDetails || [];

        // Compare each before element
        for (let beforeEl of beforeElements) {
            // Try to find matching element in after
            const afterEl = afterElements.find(a =>
                (a.id && beforeEl.id && a.id === beforeEl.id) ||
                (a.selector === beforeEl.selector && Math.abs(a.x - beforeEl.x) < 100 && Math.abs(a.y - beforeEl.y) < 100)
            );

            if (!afterEl) {
                // Element is completely missing
                issues.push({
                    type: 'ELEMENT_MISSING',
                    severity: 'CRITICAL',
                    element: beforeEl.selector,
                    tag: beforeEl.tag,
                    class: beforeEl.class,
                    text: beforeEl.text,
                    detail: `${beforeEl.tag} element is completely missing`,
                    before: beforeEl,
                    after: null
                });
                continue;
            }

            // Check if hidden with display: none
            if (beforeEl.display !== 'none' && afterEl.display === 'none') {
                issues.push({
                    type: 'HIDDEN',
                    severity: 'CRITICAL',
                    element: beforeEl.selector,
                    tag: beforeEl.tag,
                    detail: `Element hidden with CSS (display: none)`,
                    before: { display: beforeEl.display },
                    after: { display: afterEl.display }
                });
            }

            // Check if hidden with visibility
            if (beforeEl.visibility !== 'hidden' && afterEl.visibility === 'hidden') {
                issues.push({
                    type: 'VISIBILITY_HIDDEN',
                    severity: 'HIGH',
                    element: beforeEl.selector,
                    tag: beforeEl.tag,
                    detail: `Element hidden with CSS (visibility: hidden)`,
                    before: { visibility: beforeEl.visibility },
                    after: { visibility: afterEl.visibility }
                });
            }

            // Check font size changes
            if (beforeEl.fontSize && afterEl.fontSize && beforeEl.fontSize !== afterEl.fontSize) {
                const beforeSize = parseInt(beforeEl.fontSize);
                const afterSize = parseInt(afterEl.fontSize);
                const percentChange = Math.round(((afterSize - beforeSize) / beforeSize) * 100);

                if (Math.abs(percentChange) > 20) {
                    issues.push({
                        type: 'FONT_SIZE_CHANGED',
                        severity: Math.abs(percentChange) > 40 ? 'HIGH' : 'MEDIUM',
                        element: beforeEl.selector,
                        tag: beforeEl.tag,
                        detail: `Font size: ${beforeEl.fontSize} → ${afterEl.fontSize} (${percentChange > 0 ? '+' : ''}${percentChange}%)`,
                        before: { fontSize: beforeEl.fontSize },
                        after: { fontSize: afterEl.fontSize }
                    });
                }
            }

            // Check color changes
            if (beforeEl.color && afterEl.color && beforeEl.color !== afterEl.color) {
                issues.push({
                    type: 'COLOR_CHANGED',
                    severity: 'MEDIUM',
                    element: beforeEl.selector,
                    tag: beforeEl.tag,
                    detail: `Text color changed: ${beforeEl.color} → ${afterEl.color}`,
                    before: { color: beforeEl.color },
                    after: { color: afterEl.color }
                });
            }

            // Check position changes
            const xDiff = Math.abs(afterEl.x - beforeEl.x);
            const yDiff = Math.abs(afterEl.y - beforeEl.y);
            if (xDiff > 50 || yDiff > 50) {
                issues.push({
                    type: 'POSITION_CHANGED',
                    severity: yDiff > 100 ? 'HIGH' : 'LOW',
                    element: beforeEl.selector,
                    tag: beforeEl.tag,
                    detail: `Position shifted: (${beforeEl.x}, ${beforeEl.y}) → (${afterEl.x}, ${afterEl.y})`,
                    before: { x: beforeEl.x, y: beforeEl.y },
                    after: { x: afterEl.x, y: afterEl.y }
                });
            }

            // Check broken images
            if (beforeEl.isImg && beforeEl.imgLoaded && afterEl.isImg && !afterEl.imgLoaded) {
                issues.push({
                    type: 'IMAGE_BROKEN',
                    severity: 'HIGH',
                    element: beforeEl.selector,
                    tag: 'img',
                    detail: `Image failed to load: ${afterEl.imgSrc}`,
                    before: { loaded: true, src: beforeEl.imgSrc },
                    after: { loaded: false, src: afterEl.imgSrc }
                });
            }
        }

        return issues;
    }

    findChangedElements(beforeDetails, afterDetails) {
        // Legacy function for highlighting - returns simple position changes
        const changed = [];
        const beforeElements = beforeDetails || [];
        const afterElements = afterDetails || [];

        for (let beforeEl of beforeElements) {
            const afterEl = afterElements.find(a =>
                (a.id && beforeEl.id && a.id === beforeEl.id) ||
                (a.selector === beforeEl.selector && Math.abs(a.x - beforeEl.x) < 100)
            );

            if (!afterEl) {
                changed.push({
                    x: beforeEl.x,
                    y: beforeEl.y,
                    width: beforeEl.rectWidth,
                    height: beforeEl.rectHeight,
                    tag: beforeEl.tag
                });
            }
        }

        return changed;
    }
}

module.exports = new PageComparator();
