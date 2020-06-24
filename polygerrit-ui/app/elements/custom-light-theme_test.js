/**
 * @license
 * Copyright (C) 2020 The Android Open Source Project
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

import '../test/common-test-setup-karma.js';
import {getComputedStyleValue} from '../utils/dom-util.js';
import './shared/gr-rest-api-interface/gr-rest-api-interface.js';
import './gr-app.js';
import {pluginLoader} from './shared/gr-js-api-interface/gr-plugin-loader.js';
const basicFixture = fixtureFromElement('gr-app');

suite('gr-app custom light theme tests', () => {
  let sandbox;
  let element;
  setup(done => {
    sandbox = sinon.sandbox.create();
    window.localStorage.removeItem('dark-theme');
    stub('gr-rest-api-interface', {
      getConfig() { return Promise.resolve({test: 'config'}); },
      getAccount() { return Promise.resolve({}); },
      getDiffComments() { return Promise.resolve({}); },
      getDiffRobotComments() { return Promise.resolve({}); },
      getDiffDrafts() { return Promise.resolve({}); },
      _fetchSharedCacheURL() { return Promise.resolve({}); },
    });
    element = basicFixture.instantiate();
    pluginLoader.loadPlugins([]);
    pluginLoader.awaitPluginsLoaded().then(() => flush(done));
  });
  teardown(() => {
    sandbox.restore();
  });

  test('should not load dark theme', () => {
    assert.isFalse(
        !!document.querySelector('link[href="/styles/themes/dark-theme.html"]')
    );
  });

  test('applies the right theme', () => {
    assert.equal(
        getComputedStyleValue('--primary-text-color', element)
            .toLowerCase(),
        'black');
    assert.equal(
        getComputedStyleValue('--header-background-color', element)
            .toLowerCase(),
        '#f1f3f4');
    assert.equal(
        getComputedStyleValue('--footer-background-color', element)
            .toLowerCase(),
        'transparent');
  });
});