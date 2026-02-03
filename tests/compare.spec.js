const { test, expect } = require('@playwright/test');

const leftText = `container: {
  minHeight: 'calc(100vh - 50px)',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: \`url(\${BackgroundImage})\`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    opacity: 0.2,
    zIndex: -1,
  },
},`;

const rightText = `container: {
  height: 'calc(100vh - 50px)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: \`url(\${BackgroundImage})\`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    opacity: 0.2,
  },
},`;

async function compare(page, textA, textB) {
  await page.goto('/');
  const left = page.locator('#text1');
  const right = page.locator('#text2');
  await left.fill(textA);
  await right.fill(textB);
  await page.getByRole('button', { name: 'Compare' }).click();
}

function findLineNumber(lines, searchText) {
  for (const line of lines) {
    if (line.includes(searchText)) {
      const match = line.match(/^(\d+):/);
      return match ? match[1] : null;
    }
  }
  return null;
}

test('right-only insertion leaves blank line on the left', async ({ page }) => {
  await compare(page, leftText, rightText);

  const rightLines = (await page.locator('#text2').innerText()).split('\n');
  const leftLines = (await page.locator('#text1').innerText()).split('\n');

  const lineNumber = findLineNumber(rightLines, "justifyContent: 'space-between',");
  expect(lineNumber).not.toBeNull();

  const leftLine = leftLines.find((line) => line.startsWith(`${lineNumber}:`));
  expect(leftLine).toBeDefined();
  expect(leftLine.replace(`${lineNumber}:`, '').trim()).toBe('');
});

test('left-only insertion leaves blank line on the right', async ({ page }) => {
  await compare(page, leftText, rightText);

  const leftLines = (await page.locator('#text1').innerText()).split('\n');
  const rightLines = (await page.locator('#text2').innerText()).split('\n');

  const lineNumber = findLineNumber(leftLines, "minHeight: 'calc(100vh - 50px)',");
  expect(lineNumber).not.toBeNull();

  const rightLine = rightLines.find((line) => line.startsWith(`${lineNumber}:`));
  expect(rightLine).toBeDefined();
  expect(rightLine.replace(`${lineNumber}:`, '').trim()).toBe("height: 'calc(100vh - 50px)',");
});

test('identical texts show the same message', async ({ page }) => {
  await compare(page, leftText, leftText);
  await expect(page.locator('#message-div')).toHaveText('The texts are the same.');
});

test('line edits stay on the same line without adding blank lines', async ({ page }) => {
  const textA = `if (x) {\n  j++;\n}`;
  const textB = `if (x) {\n  j++;asd\n}`;

  await compare(page, textA, textB);

  const leftLines = (await page.locator('#text1').innerText()).split('\n');
  const rightLines = (await page.locator('#text2').innerText()).split('\n');

  const leftLineNumber = findLineNumber(leftLines, 'j++;');
  expect(leftLineNumber).not.toBeNull();

  const rightLineNumber = findLineNumber(rightLines, 'j++;asd');
  expect(rightLineNumber).not.toBeNull();

  expect(leftLineNumber).toBe(rightLineNumber);

  const leftLine = leftLines.find((line) => line.startsWith(`${leftLineNumber}:`));
  const rightLine = rightLines.find((line) => line.startsWith(`${rightLineNumber}:`));
  expect(leftLine.replace(`${leftLineNumber}:`, '').trim()).not.toBe('');
  expect(rightLine.replace(`${rightLineNumber}:`, '').trim()).not.toBe('');
});
