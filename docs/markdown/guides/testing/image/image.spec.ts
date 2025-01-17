import {parseMarkdown} from '../../../guides/parse.js';
import {runfiles} from '@bazel/runfiles';
import {readFile} from 'fs/promises';
import {JSDOM} from 'jsdom';

describe('markdown to html', () => {
  let markdownDocument: DocumentFragment;

  beforeAll(async () => {
    const markdownContent = await readFile(runfiles.resolvePackageRelative('image/image.md'), {
      encoding: 'utf-8',
    });
    markdownDocument = JSDOM.fragment(await parseMarkdown(markdownContent));
  });

  it('should wrap images in custom classes', () => {
    const image = markdownDocument.querySelector('img');
    expect(image?.classList.contains('docs-image')).toBeTrue();
  });

  it('should handle images hosted internal to the application', () => {
    const image = markdownDocument.querySelector('img[title="Local Image"]');
    expect(image?.getAttribute('src')).toBe('unknown/some-image.png');
  });
});
