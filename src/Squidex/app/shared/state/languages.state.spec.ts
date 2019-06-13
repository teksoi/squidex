/*
 * Squidex Headless CMS
 *
 * @license
 * Copyright (c) Squidex UG (haftungsbeschränkt). All rights reserved.
 */

import { of } from 'rxjs';
import { IMock, It, Mock, Times } from 'typemoq';

import {
    AppLanguagesService,
    DialogService,
    ImmutableArray,
    LanguageDto,
    LanguagesService,
    LanguagesState,
    versioned
} from '@app/shared/internal';

import { createLanguages } from '../services/app-languages.service.spec';

import { TestValues } from './_test-helpers';

describe('LanguagesState', () => {
    const {
        app,
        appsState,
        newVersion,
        version
    } = TestValues;

    const languageDE = new LanguageDto('de', 'German');
    const languageEN = new LanguageDto('en', 'English');
    const languageIT = new LanguageDto('it', 'Italian');
    const languageES = new LanguageDto('es', 'Spanish');

    const oldLanguages = createLanguages('en', 'de');

    let dialogs: IMock<DialogService>;
    let languagesService: IMock<AppLanguagesService>;
    let languagesState: LanguagesState;
    let allLanguagesService: IMock<LanguagesService>;

    beforeEach(() => {
        dialogs = Mock.ofType<DialogService>();

        allLanguagesService = Mock.ofType<LanguagesService>();

        allLanguagesService.setup(x => x.getLanguages())
            .returns(() => of([languageDE, languageEN, languageIT, languageES])).verifiable();

        languagesService = Mock.ofType<AppLanguagesService>();

        languagesService.setup(x => x.getLanguages(app))
            .returns(() => of({ payload: oldLanguages, version })).verifiable();

        languagesState = new LanguagesState(languagesService.object, appsState.object, dialogs.object, allLanguagesService.object);
    });

    afterEach(() => {
        languagesService.verifyAll();

        allLanguagesService.verifyAll();
    });

    describe('Loading', () => {
        it('should load languages', () => {
            languagesState.load().subscribe();

            expect(languagesState.snapshot.languages.values).toEqual([
               {
                   language: oldLanguages.items[0],
                   fallbackLanguages: ImmutableArray.empty(),
                   fallbackLanguagesNew: ImmutableArray.of([oldLanguages[1]])
               }, {
                   language: oldLanguages.items[1],
                   fallbackLanguages: ImmutableArray.of([oldLanguages[0]]),
                   fallbackLanguagesNew: ImmutableArray.empty()
               }
            ]);
            expect(languagesState.snapshot.allLanguagesNew.values).toEqual([languageIT, languageES]);
            expect(languagesState.snapshot.isLoaded).toBeTruthy();
            expect(languagesState.snapshot.version).toEqual(version);

            dialogs.verify(x => x.notifyInfo(It.isAnyString()), Times.never());
        });

        it('should show notification on load when reload is true', () => {
            languagesState.load(true).subscribe();

            expect().nothing();

            dialogs.verify(x => x.notifyInfo(It.isAnyString()), Times.once());
        });
    });

    describe('Updates', () => {
        beforeEach(() => {
            languagesState.load().subscribe();
        });

        it('should add language to snapshot when assigned', () => {
            const updated = createLanguages('de');

            languagesService.setup(x => x.postLanguage(app, It.isAny(), version))
                .returns(() => of(versioned(newVersion, updated))).verifiable();

            languagesState.add(languageIT).subscribe();

            expect(languagesState.snapshot.languages.values).toEqual([
                {
                    language: oldLanguages[0],
                    fallbackLanguages: ImmutableArray.empty(),
                    fallbackLanguagesNew: ImmutableArray.empty()
                }
            ]);
            expect(languagesState.snapshot.allLanguagesNew.values).toEqual([languageDE, languageIT, languageES]);
            expect(languagesState.snapshot.version).toEqual(newVersion);
        });

        it('should update language in snapshot when updated', () => {
            const updated = createLanguages('de');

            const request = { isMaster: true, isOptional: false, fallback: [] };

            languagesService.setup(x => x.putLanguage(app, oldLanguages[1].iso2Code, request, version))
                .returns(() => of(versioned(newVersion, updated))).verifiable();

            languagesState.update(oldLanguages[1], request).subscribe();

            expect(languagesState.snapshot.languages.values).toEqual([
                {
                    language: oldLanguages[0],
                    fallbackLanguages: ImmutableArray.empty(),
                    fallbackLanguagesNew: ImmutableArray.empty()
                }
            ]);
            expect(languagesState.snapshot.allLanguagesNew.values).toEqual([languageDE, languageIT, languageES]);
            expect(languagesState.snapshot.version).toEqual(newVersion);
        });

        it('should remove language from snapshot when deleted', () => {
            const updated = createLanguages('de');

            languagesService.setup(x => x.deleteLanguage(app, oldLanguages[1].iso2Code, version))
                .returns(() => of(versioned(newVersion, updated))).verifiable();

            languagesState.remove(oldLanguages[1]).subscribe();

            expect(languagesState.snapshot.languages.values).toEqual([
                {
                    language: oldLanguages[0],
                    fallbackLanguages: ImmutableArray.empty(),
                    fallbackLanguagesNew: ImmutableArray.empty()
                }
            ]);
            expect(languagesState.snapshot.allLanguagesNew.values).toEqual([languageDE, languageIT, languageES]);
            expect(languagesState.snapshot.version).toEqual(newVersion);
        });
    });
});