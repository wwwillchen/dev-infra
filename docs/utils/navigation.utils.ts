/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {inject} from '@angular/core';
import {ActivatedRouteSnapshot, Route, Router} from '@angular/router';
import {NavigationItem} from '../interfaces/index.js';
import {DOCS_CONTENT_LOADER} from '../providers/index.js';

export const flatNavigationData = (tree: NavigationItem[]) => {
  const result: NavigationItem[] = [];

  const traverse = (node: NavigationItem, level: number) => {
    node.level = level;
    if (node.path) {
      result.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        child.parent = node;
        traverse(child, level + 1);
      }
    }
  };

  for (const node of tree) {
    traverse(node, 1);
  }

  return result;
};

export const getNavigationItemsTree = (
  tree: NavigationItem[],
  mapFn: (item: NavigationItem) => void,
) => {
  const traverse = (node: NavigationItem) => {
    mapFn(node);
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  };

  for (const node of tree) {
    traverse(node);
  }

  return tree;
};

export const findNavigationItem = (
  items: NavigationItem[],
  predicate: (item: NavigationItem) => boolean,
): NavigationItem | null => {
  let result: NavigationItem | null = null;

  const traverse = (node: NavigationItem) => {
    if (predicate(node)) {
      result = node;
    }
    if (node.children && !result) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  };

  for (const node of items) {
    traverse(node);
  }

  return result;
};

export const isExternalLink = (link: string, windowOrigin: string) =>
  new URL(link).origin !== windowOrigin;

export const markExternalLinks = (item: NavigationItem, origin: string): void => {
  if (item.path) {
    try {
      item.isExternal = isExternalLink(item.path, origin);
    } catch (err) {}
  }
};

export const mapNavigationItemsToRoutes = (
  navigationItems: NavigationItem[],
  additionalRouteProperties: Partial<Route>,
): Route[] =>
  navigationItems
    .filter((route): route is NavigationItem & {path: string} => Boolean(route.path))
    .map((navigationItem) => {
      const route = {
        path: navigationItem.path,
        ...additionalRouteProperties,
      };

      route.data = {
        ...navigationItem,
        ...route.data,
      };

      route.resolve = {
        'docContent': (snapshot: ActivatedRouteSnapshot) => {
          return snapshot.data['contentPath'] !== undefined
            ? inject(DOCS_CONTENT_LOADER).getContent(snapshot.data['contentPath'])
            : undefined;
        },
        ...route.resolve,
      };
      return route;
    });

export const normalizePath = (path: string): string => {
  if (path[0] === '/') {
    return path.substring(1);
  }
  return path;
};

export const getBaseUrlAfterRedirects = (url: string, router: Router): string => {
  const route = router.parseUrl(url);
  route.fragment = null;
  route.queryParams = {};
  return normalizePath(route.toString());
};

export function handleHrefClickEventWithRouter(e: Event, router: Router) {
  const pointerEvent = e as PointerEvent;
  if (
    pointerEvent.ctrlKey ||
    pointerEvent.shiftKey ||
    pointerEvent.altKey ||
    pointerEvent.metaKey
  ) {
    return;
  }

  const closestAnchor = (e.target as Element).closest('a');
  if (closestAnchor?.target && closestAnchor.target !== 'self') {
    return;
  }

  const relativeUrl = closestAnchor?.getAttribute?.('href');
  if (relativeUrl) {
    e.preventDefault();
    router.navigateByUrl(relativeUrl);
  }
}

export function getActivatedRouteSnapshotFromRouter(router: Router): ActivatedRouteSnapshot {
  let route = router.routerState.root.snapshot;

  while (route.firstChild) {
    route = route.firstChild;
  }
  return route;
}
