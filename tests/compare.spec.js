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

test('trailing insertion is not dropped when lines are shifted', async ({ page }) => {
  // Alignment of these texts produces 4 rows (delete + 2 matches + insert),
  // which is longer than either input — the last row used to be dropped.
  await compare(page, 'alpha\nbravo\ncharlie', 'bravo\ncharlie\ndelta');

  const leftLines = (await page.locator('#text1').innerText()).split('\n');
  const rightLines = (await page.locator('#text2').innerText()).split('\n');

  const lineNumber = findLineNumber(rightLines, 'delta');
  expect(lineNumber).not.toBeNull();

  const leftLine = leftLines.find((line) => line.startsWith(`${lineNumber}:`));
  expect(leftLine).toBeDefined();
  expect(leftLine.replace(`${lineNumber}:`, '').trim()).toBe('');
});

test('clear all resets the tool for a new comparison', async ({ page }) => {
  await compare(page, 'one\ntwo', 'one\nthree');
  await page.getByRole('button', { name: 'Clear All' }).click();

  await expect(page.locator('#text1')).toHaveText('');
  await expect(page.locator('#text2')).toHaveText('');

  await page.locator('#text1').fill('same');
  await page.locator('#text2').fill('same');
  await page.getByRole('button', { name: 'Compare' }).click();
  await expect(page.locator('#message-div')).toHaveText('The texts are the same.');
});

test('large single-line texts compare without freezing', async ({ page }) => {
  // A small edit inside one huge line used to build a full chars×chars LCS
  // matrix and crash/freeze the tab.
  const big = 'lorem ipsum dolor sit amet consectetur adipiscing elit '.repeat(1100);
  const bigEdited = big.slice(0, 30000) + ' EDITED HERE ' + big.slice(30000);

  await compare(page, big, bigEdited);

  const rightText = await page.locator('#text2').innerText();
  expect(rightText).toContain('EDITED HERE');
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
