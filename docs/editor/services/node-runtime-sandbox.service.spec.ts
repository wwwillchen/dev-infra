/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {TestBed} from '@angular/core/testing';
import {BehaviorSubject, of as observableOf} from 'rxjs';

import {signal} from '@angular/core';
import {WebContainer} from '@webcontainer/api';
import {TutorialType} from '../../interfaces/index.js';
import {FakeWebContainer, FakeWebContainerProcess} from '../../utils/testing-helper.js';
import {AlertManager} from './alert-manager.service.js';
import {EmbeddedTutorialManager} from './embedded-tutorial-manager.service.js';
import {LoadingStep} from './node-runtime-sandbox.service.js';
import {
  DEV_SERVER_READY_MSG,
  NodeRuntimeSandbox,
  OUT_OF_MEMORY_MSG,
  PACKAGE_MANAGER,
} from './node-runtime-sandbox.service.js';
import {NodeRuntimeState} from './node-runtime-state.service.js';
import {TerminalHandler} from './terminal-handler.service.js';
import {TypingsLoader} from './typings-loader.service.js';

describe('NodeRuntimeSandbox', () => {
  let testBed: TestBed;
  let service: NodeRuntimeSandbox;

  const fakeTerminalHandler = {
    interactiveTerminalInstance: {
      write: (data: string) => {},
      onData: (data: string) => {},
      breakProcess$: observableOf(),
    },
    readonlyTerminalInstance: {
      write: (data: string) => {},
    },
    clearTerminals: () => {},
  };

  const tutorialChanged$ = new BehaviorSubject(false);

  const fakeEmbeddedTutorialManager: Partial<EmbeddedTutorialManager> = {
    tutorialId: signal('tutorial'),
    tutorialFilesystemTree: signal({'app.js': {file: {contents: ''}}}),
    commonFilesystemTree: signal({'app.js': {file: {contents: ''}}}),
    openFiles: signal(['app.js']),
    tutorialFiles: signal({'app.js': ''}),
    hiddenFiles: signal(['hidden.js']),
    answerFiles: signal({'answer.ts': ''}),
    type: signal(TutorialType.EDITOR),
    tutorialChanged$,
    shouldReInstallDependencies: signal(false),
    filesToDeleteFromPreviousProject: signal(new Set([])),
  };

  const setValuesToInitializeAngularCLI = () => {
    service['embeddedTutorialManager'].type.set(TutorialType.CLI);
    service['webContainerPromise'] = Promise.resolve(new FakeWebContainer());
  };

  const setValuesToInitializeProject = () => {
    service['embeddedTutorialManager'].type.set(TutorialType.EDITOR);

    const fakeSpawnProcess = new FakeWebContainerProcess();
    fakeSpawnProcess.output = {
      pipeTo: (data: WritableStream) => {
        data.getWriter().write(DEV_SERVER_READY_MSG);
      },
      pipeThrough: () => fakeSpawnProcess.output,
    } as any;

    service['webContainerPromise'] = Promise.resolve(
      new FakeWebContainer({spawn: fakeSpawnProcess}),
    );
  };

  const setValuesToCatchOutOfMemoryError = () => {
    service['embeddedTutorialManager'].type.set(TutorialType.EDITOR);

    const fakeSpawnProcess = new FakeWebContainerProcess();
    fakeSpawnProcess.output = {
      pipeTo: (data: WritableStream) => {
        data.getWriter().write(OUT_OF_MEMORY_MSG);
      },
      pipeThrough: () => fakeSpawnProcess.output,
    } as any;

    service['webContainerPromise'] = Promise.resolve(
      new FakeWebContainer({spawn: fakeSpawnProcess}),
    );
  };

  const fakeTypingsLoader: Partial<TypingsLoader> = {
    retrieveTypeDefinitions: (webcontainer: WebContainer) => Promise.resolve(),
  };
  const fakeAlertManager = {
    init: () => {},
  };

  beforeEach(() => {
    testBed = TestBed.configureTestingModule({
      providers: [
        NodeRuntimeSandbox,
        {
          provide: TerminalHandler,
          useValue: fakeTerminalHandler,
        },
        {
          provide: TypingsLoader,
          useValue: fakeTypingsLoader,
        },
        {
          provide: EmbeddedTutorialManager,
          useValue: fakeEmbeddedTutorialManager,
        },
        {
          provide: AlertManager,
          useValue: fakeAlertManager,
        },
        {
          provide: NodeRuntimeState,
        },
      ],
    });

    service = testBed.inject(NodeRuntimeSandbox);

    service['embeddedTutorialManager'].type.set(TutorialType.EDITOR);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set error message when install dependencies resolve exitCode not equal to 0', async () => {
    const EXPECTED_ERROR = 'Installation failed';

    service['webContainerPromise'] = Promise.resolve(new FakeWebContainer());

    const fakeSpawn = new FakeWebContainerProcess();
    fakeSpawn.exit = Promise.resolve(10);

    spyOn(service, 'spawn' as any)
      .withArgs(PACKAGE_MANAGER, ['install'])
      .and.returnValue(fakeSpawn);

    await service.init();

    expect(service['nodeRuntimeState'].error()?.message).toBe(EXPECTED_ERROR);
  });

  it('should have ready loading state after init succeeds', async () => {
    setValuesToInitializeProject();

    await service.init();

    const state = TestBed.inject(NodeRuntimeState);
    expect(state.loadingStep()).toBe(LoadingStep.READY);
  });

  it('should call writeFile with proper parameters', async () => {
    setValuesToInitializeProject();

    const fakeWebContainer = new FakeWebContainer();
    service['webContainerPromise'] = Promise.resolve(fakeWebContainer);
    const writeFileSpy = spyOn(fakeWebContainer.fs, 'writeFile');

    const path = 'path';
    const content = 'content';

    await service.writeFile(path, content);
    expect(writeFileSpy).toHaveBeenCalledOnceWith(path, content);
  });

  it('should initialize the Angular CLI based on the tutorial config', async () => {
    setValuesToInitializeAngularCLI();

    const initAngularCliSpy = spyOn(service, 'initAngularCli' as any);

    await service.init();

    expect(initAngularCliSpy).toHaveBeenCalled();
  });

  it('should initialize a project based on the tutorial config', async () => {
    service['webContainerPromise'] = Promise.resolve(new FakeWebContainer());
    setValuesToInitializeProject();

    const initProjectSpy = spyOn(service, 'initProject' as any);

    await service.init();

    expect(initProjectSpy).toHaveBeenCalled();
  });

  it('should cleanup when initializing the Angular CLI if a project was initialized before', async () => {
    const cleanupSpy = spyOn(service, 'cleanup' as any);

    setValuesToInitializeProject();
    await service.init();

    expect(cleanupSpy).not.toHaveBeenCalled();

    setValuesToInitializeAngularCLI();
    await service.init();

    expect(cleanupSpy).toHaveBeenCalledOnceWith();
  });

  it('should cleanup when initializing a project if the Angular CLI was initialized before', async () => {
    const cleanupSpy = spyOn(service, 'cleanup' as any);

    setValuesToInitializeAngularCLI();
    await service.init();

    expect(cleanupSpy).not.toHaveBeenCalled();

    setValuesToInitializeProject();
    await service.init();

    expect(cleanupSpy).toHaveBeenCalledOnceWith();
  });

  it("should set the error state when an out of memory message is received from the web container's output", async () => {
    service['webContainerPromise'] = Promise.resolve(new FakeWebContainer());
    setValuesToCatchOutOfMemoryError();

    await service.init();

    expect(service['nodeRuntimeState'].error()!.message).toBe(OUT_OF_MEMORY_MSG);
    expect(service['nodeRuntimeState'].loadingStep()).toBe(LoadingStep.ERROR);
  });

  it('should run reset only once when called twice', async () => {
    const cleanupSpy = spyOn(service, 'cleanup' as any);
    const initSpy = spyOn(service, 'init' as any);

    setValuesToInitializeProject();

    const resetPromise = service.reset();
    const secondResetPromise = service.reset();

    await Promise.all([resetPromise, secondResetPromise]);

    expect(cleanupSpy).toHaveBeenCalledOnceWith();
    expect(initSpy).toHaveBeenCalledOnceWith();
  });

  it('should delete files on project change', async () => {
    service['webContainerPromise'] = Promise.resolve(new FakeWebContainer());
    setValuesToInitializeProject();

    await service.init();

    const filesToDeleteFromPreviousProject = ['deleteme.ts'];

    service['embeddedTutorialManager'] = {
      ...fakeEmbeddedTutorialManager,
      filesToDeleteFromPreviousProject: signal(new Set(filesToDeleteFromPreviousProject)),
    } as any;

    const createdFiles = ['created.ts'];
    service['_createdFiles'].set(new Set(createdFiles));

    const deleteFileSpy = spyOn(service, 'deleteFile');

    tutorialChanged$.next(true);

    const allFilesToDelete = [...createdFiles, ...filesToDeleteFromPreviousProject];

    for (const fileToDelete of allFilesToDelete) {
      expect(deleteFileSpy).toHaveBeenCalledWith(fileToDelete);
    }
  });
});
