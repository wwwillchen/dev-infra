/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {Directive, ElementRef, Input, inject} from '@angular/core';
import {Highlightable} from '@angular/cdk/a11y';
import {SearchResult} from '../../interfaces/search-results.js';

@Directive({
  selector: '[docsSearchItem]',
  standalone: true,
  host: {
    '[class.active]': 'isActive',
  },
})
export class SearchItem implements Highlightable {
  @Input() item?: SearchResult;
  @Input() disabled = false;

  private readonly elementRef = inject(ElementRef<HTMLLIElement>);

  private _isActive = false;

  protected get isActive() {
    return this._isActive;
  }

  setActiveStyles(): void {
    this._isActive = true;
  }

  setInactiveStyles(): void {
    this._isActive = false;
  }

  getLabel(): string {
    if (!this.item?.hierarchy) {
      return '';
    }
    const {hierarchy} = this.item;
    return `${hierarchy.lvl0}${hierarchy.lvl1}${hierarchy.lvl2}`;
  }

  scrollIntoView(): void {
    this.elementRef?.nativeElement.scrollIntoView({block: 'nearest'});
  }
}
