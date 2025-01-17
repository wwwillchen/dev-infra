/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {existsSync, readFileSync} from 'fs';
import {join} from 'path';
import {cwd} from 'process';

/** The base url for edting the a file in the repository. */
const GITHUB_EDIT_CONTENT_URL = '//';
/** The path within the repository to the file being displayed. */
const CURRENT_PAGE_PATH = '//';

/** Get the page title with edit button to modify the page source. */
export function getPageTitle(text: string): string {
  return `
  <!-- Page title -->
  <div class="docs-page-title">
    <h1 tabindex="-1">${text}</h1>
    <a class="docs-github-links" target="_blank" href="${GITHUB_EDIT_CONTENT_URL}/${CURRENT_PAGE_PATH}" title="Edit this page" aria-label="Edit this page">
      <!-- Pencil -->
      <docs-icon role="presentation">edit</docs-icon>
    </a>
  </div>`;
}

/** The base directory of the workspace the script is running in. */
const WORKSPACE_DIR = cwd();

export function loadWorkspaceRelativeFile(filePath: string): string {
  const fullFilePath = join(WORKSPACE_DIR, filePath);
  if (!existsSync(fullFilePath)) {
    throw Error(`Cannot find: ${filePath}`);
  }
  return readFileSync(fullFilePath, {encoding: 'utf-8'});
}
