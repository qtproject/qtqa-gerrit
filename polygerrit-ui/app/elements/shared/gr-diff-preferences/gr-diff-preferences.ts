/**
 * @license
 * Copyright (C) 2016 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import '@polymer/iron-input/iron-input';
import '../../../styles/shared-styles';
import '../gr-button/gr-button';
import '../gr-select/gr-select';
import {PolymerElement} from '@polymer/polymer/polymer-element';
import {htmlTemplate} from './gr-diff-preferences_html';
import {customElement, property} from '@polymer/decorators';
import {DiffPreferencesInfo} from '../../../types/diff';
import {GrSelect} from '../gr-select/gr-select';
import {appContext} from '../../../services/app-context';

export interface GrDiffPreferences {
  $: {
    lineWrappingInput: HTMLInputElement;
    showTabsInput: HTMLInputElement;
    showTrailingWhitespaceInput: HTMLInputElement;
    automaticReviewInput: HTMLInputElement;
    syntaxHighlightInput: HTMLInputElement;
    contextSelect: GrSelect;
  };
  save(): Promise<void>;
}

@customElement('gr-diff-preferences')
export class GrDiffPreferences extends PolymerElement {
  static get template() {
    return htmlTemplate;
  }

  @property({type: Boolean, notify: true})
  hasUnsavedChanges = false;

  @property({type: Object})
  diffPrefs?: DiffPreferencesInfo;

  private readonly restApiService = appContext.restApiService;

  loadData() {
    return this.restApiService.getDiffPreferences().then(prefs => {
      this.diffPrefs = prefs;
    });
  }

  _handleDiffPrefsChanged() {
    this.hasUnsavedChanges = true;
  }

  _handleLineWrappingTap() {
    this.set('diffPrefs.line_wrapping', this.$.lineWrappingInput.checked);
    this._handleDiffPrefsChanged();
  }

  _handleShowTabsTap() {
    this.set('diffPrefs.show_tabs', this.$.showTabsInput.checked);
    this._handleDiffPrefsChanged();
  }

  _handleShowTrailingWhitespaceTap() {
    this.set(
      'diffPrefs.show_whitespace_errors',
      this.$.showTrailingWhitespaceInput.checked
    );
    this._handleDiffPrefsChanged();
  }

  _handleSyntaxHighlightTap() {
    this.set(
      'diffPrefs.syntax_highlighting',
      this.$.syntaxHighlightInput.checked
    );
    this._handleDiffPrefsChanged();
  }

  _handleAutomaticReviewTap() {
    this.set('diffPrefs.manual_review', !this.$.automaticReviewInput.checked);
    this._handleDiffPrefsChanged();
  }

  save() {
    if (!this.diffPrefs)
      return Promise.reject(new Error('Missing diff preferences'));
    return this.restApiService.saveDiffPreferences(this.diffPrefs).then(_ => {
      this.hasUnsavedChanges = false;
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gr-diff-preferences': GrDiffPreferences;
  }
}
