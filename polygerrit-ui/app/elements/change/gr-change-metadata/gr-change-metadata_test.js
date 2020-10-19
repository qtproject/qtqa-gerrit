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

import '../../../test/common-test-setup-karma.js';
import '../../core/gr-router/gr-router.js';
import './gr-change-metadata.js';
import {GerritNav} from '../../core/gr-navigation/gr-navigation.js';
import {getPluginLoader} from '../../shared/gr-js-api-interface/gr-plugin-loader.js';
import {_testOnly_initGerritPluginApi} from '../../shared/gr-js-api-interface/gr-gerrit.js';

const basicFixture = fixtureFromElement('gr-change-metadata');

const pluginApi = _testOnly_initGerritPluginApi();

suite('gr-change-metadata tests', () => {
  let element;

  setup(() => {
    stub('gr-rest-api-interface', {
      getConfig() { return Promise.resolve({}); },
      getLoggedIn() { return Promise.resolve(false); },
    });

    element = basicFixture.instantiate();
  });

  test('computed fields', () => {
    assert.isFalse(element._computeHideStrategy({status: 'NEW'}));
    assert.isTrue(element._computeHideStrategy({status: 'MERGED'}));
    assert.isTrue(element._computeHideStrategy({status: 'ABANDONED'}));
    assert.equal(element._computeStrategy({submit_type: 'CHERRY_PICK'}),
        'Cherry Pick');
    assert.equal(element._computeStrategy({submit_type: 'REBASE_ALWAYS'}),
        'Rebase Always');
  });

  test('computed fields requirements', () => {
    assert.isFalse(element._computeShowRequirements({status: 'MERGED'}));
    assert.isFalse(element._computeShowRequirements({status: 'ABANDONED'}));

    // No labels and no requirements: submit status is useless
    assert.isFalse(element._computeShowRequirements({
      status: 'NEW',
      labels: {},
    }));

    // Work in Progress: submit status should be present
    assert.isTrue(element._computeShowRequirements({
      status: 'NEW',
      labels: {},
      work_in_progress: true,
    }));

    // We have at least one reason to display Submit Status
    assert.isTrue(element._computeShowRequirements({
      status: 'NEW',
      labels: {
        Verified: {
          approved: false,
        },
      },
      requirements: [],
    }));
    assert.isTrue(element._computeShowRequirements({
      status: 'NEW',
      labels: {},
      requirements: [{
        fallback_text: 'Resolve all comments',
        status: 'OK',
      }],
    }));
  });

  test('show strategy for open change', () => {
    element.change = {status: 'NEW', submit_type: 'CHERRY_PICK', labels: {}};
    flush();
    const strategy = element.shadowRoot
        .querySelector('.strategy');
    assert.ok(strategy);
    assert.isFalse(strategy.hasAttribute('hidden'));
    assert.equal(strategy.children[1].innerHTML, 'Cherry Pick');
  });

  test('hide strategy for closed change', () => {
    element.change = {status: 'MERGED', labels: {}};
    flush();
    assert.isTrue(element.shadowRoot
        .querySelector('.strategy').hasAttribute('hidden'));
  });

  test('weblinks use GerritNav interface', () => {
    const weblinksStub = sinon.stub(GerritNav, '_generateWeblinks')
        .returns([{name: 'stubb', url: '#s'}]);
    element.commitInfo = {};
    element.serverConfig = {};
    flush();
    const webLinks = element.$.webLinks;
    assert.isTrue(weblinksStub.called);
    assert.isFalse(webLinks.hasAttribute('hidden'));
    assert.equal(element._computeWebLinks(element.commitInfo).length, 1);
  });

  test('weblinks hidden when no weblinks', () => {
    element.commitInfo = {};
    element.serverConfig = {};
    flush();
    const webLinks = element.$.webLinks;
    assert.isTrue(webLinks.hasAttribute('hidden'));
  });

  test('weblinks hidden when only gitiles weblink', () => {
    element.commitInfo = {web_links: [{name: 'gitiles', url: '#'}]};
    element.serverConfig = {};
    flush();
    const webLinks = element.$.webLinks;
    assert.isTrue(webLinks.hasAttribute('hidden'));
    assert.equal(element._computeWebLinks(element.commitInfo), null);
  });

  test('weblinks hidden when sole weblink is set as primary', () => {
    const browser = 'browser';
    element.commitInfo = {web_links: [{name: browser, url: '#'}]};
    element.serverConfig = {
      gerrit: {
        primary_weblink_name: browser,
      },
    };
    flush();
    const webLinks = element.$.webLinks;
    assert.isTrue(webLinks.hasAttribute('hidden'));
  });

  test('weblinks are visible when other weblinks', () => {
    const router = document.createElement('gr-router');
    sinon.stub(GerritNav, '_generateWeblinks').callsFake(
        router._generateWeblinks.bind(router));

    element.commitInfo = {web_links: [{name: 'test', url: '#'}]};
    flush();
    const webLinks = element.$.webLinks;
    assert.isFalse(webLinks.hasAttribute('hidden'));
    assert.equal(element._computeWebLinks(element.commitInfo).length, 1);
    // With two non-gitiles weblinks, there are two returned.
    element.commitInfo = {
      web_links: [{name: 'test', url: '#'}, {name: 'test2', url: '#'}]};
    assert.equal(element._computeWebLinks(element.commitInfo).length, 2);
  });

  test('weblinks are visible when gitiles and other weblinks', () => {
    const router = document.createElement('gr-router');
    sinon.stub(GerritNav, '_generateWeblinks').callsFake(
        router._generateWeblinks.bind(router));

    element.commitInfo = {
      web_links: [{name: 'test', url: '#'}, {name: 'gitiles', url: '#'}]};
    flush();
    const webLinks = element.$.webLinks;
    assert.isFalse(webLinks.hasAttribute('hidden'));
    // Only the non-gitiles weblink is returned.
    assert.equal(element._computeWebLinks(element.commitInfo).length, 1);
  });

  suite('_getNonOwnerRole', () => {
    let change;

    setup(() => {
      change = {
        owner: {
          email: 'abc@def',
          _account_id: 1019328,
        },
        revisions: {
          rev1: {
            _number: 1,
            uploader: {
              email: 'ghi@def',
              _account_id: 1011123,
            },
            commit: {
              author: {email: 'jkl@def'},
              committer: {email: 'ghi@def'},
            },
          },
        },
        current_revision: 'rev1',
      };
    });

    suite('role=uploader', () => {
      test('_getNonOwnerRole for uploader', () => {
        assert.deepEqual(
            element._getNonOwnerRole(change, element._CHANGE_ROLE.UPLOADER),
            {email: 'ghi@def', _account_id: 1011123});
      });

      test('_getNonOwnerRole that it does not return uploader', () => {
        // Set the uploader email to be the same as the owner.
        change.revisions.rev1.uploader._account_id = 1019328;
        assert.isNull(element._getNonOwnerRole(change,
            element._CHANGE_ROLE.UPLOADER));
      });

      test('_getNonOwnerRole null for uploader with no current rev', () => {
        delete change.current_revision;
        assert.isNull(element._getNonOwnerRole(change,
            element._CHANGE_ROLE.UPLOADER));
      });

      test('_computeShowRoleClass show uploader', () => {
        assert.equal(element._computeShowRoleClass(
            change, element._CHANGE_ROLE.UPLOADER), '');
      });

      test('_computeShowRoleClass hide uploader', () => {
        // Set the uploader email to be the same as the owner.
        change.revisions.rev1.uploader._account_id = 1019328;
        assert.equal(element._computeShowRoleClass(change,
            element._CHANGE_ROLE.UPLOADER), 'hideDisplay');
      });
    });

    suite('role=committer', () => {
      test('_getNonOwnerRole for committer', () => {
        assert.deepEqual(
            element._getNonOwnerRole(change, element._CHANGE_ROLE.COMMITTER),
            {email: 'ghi@def'});
      });

      test('_getNonOwnerRole that it does not return committer', () => {
        // Set the committer email to be the same as the owner.
        change.revisions.rev1.commit.committer.email = 'abc@def';
        assert.isNull(element._getNonOwnerRole(change,
            element._CHANGE_ROLE.COMMITTER));
      });

      test('_getNonOwnerRole null for committer with no current rev', () => {
        delete change.current_revision;
        assert.isNull(element._getNonOwnerRole(change,
            element._CHANGE_ROLE.COMMITTER));
      });

      test('_getNonOwnerRole null for committer with no commit', () => {
        delete change.revisions.rev1.commit;
        assert.isNull(element._getNonOwnerRole(change,
            element._CHANGE_ROLE.COMMITTER));
      });

      test('_getNonOwnerRole null for committer with no committer', () => {
        delete change.revisions.rev1.commit.committer;
        assert.isNull(element._getNonOwnerRole(change,
            element._CHANGE_ROLE.COMMITTER));
      });
    });

    suite('role=author', () => {
      test('_getNonOwnerRole for author', () => {
        assert.deepEqual(
            element._getNonOwnerRole(change, element._CHANGE_ROLE.AUTHOR),
            {email: 'jkl@def'});
      });

      test('_getNonOwnerRole that it does not return author', () => {
        // Set the author email to be the same as the owner.
        change.revisions.rev1.commit.author.email = 'abc@def';
        assert.isNull(element._getNonOwnerRole(change,
            element._CHANGE_ROLE.AUTHOR));
      });

      test('_getNonOwnerRole null for author with no current rev', () => {
        delete change.current_revision;
        assert.isNull(element._getNonOwnerRole(change,
            element._CHANGE_ROLE.AUTHOR));
      });

      test('_getNonOwnerRole null for author with no commit', () => {
        delete change.revisions.rev1.commit;
        assert.isNull(element._getNonOwnerRole(change,
            element._CHANGE_ROLE.AUTHOR));
      });

      test('_getNonOwnerRole null for author with no author', () => {
        delete change.revisions.rev1.commit.author;
        assert.isNull(element._getNonOwnerRole(change,
            element._CHANGE_ROLE.AUTHOR));
      });
    });
  });

  test('Push Certificate Validation test BAD', () => {
    const serverConfig = {
      receive: {
        enable_signed_push: true,
      },
    };
    const change = {
      change_id: 'Iad9dc96274af6946f3632be53b106ef80f7ba6ca',
      owner: {
        _account_id: 1019328,
      },
      revisions: {
        rev1: {
          _number: 1,
          push_certificate: {
            key: {
              status: 'BAD',
              problems: [
                'No public keys found for key ID E5E20E52',
              ],
            },
          },
        },
      },
      current_revision: 'rev1',
      status: 'NEW',
      labels: {},
      mergeable: true,
    };
    const result =
        element._computePushCertificateValidation(serverConfig, change);
    assert.equal(result.message,
        'Push certificate is invalid:\n' +
        'No public keys found for key ID E5E20E52');
    assert.equal(result.icon, 'gr-icons:close');
    assert.equal(result.class, 'invalid');
  });

  test('Push Certificate Validation test TRUSTED', () => {
    const serverConfig = {
      receive: {
        enable_signed_push: true,
      },
    };
    const change = {
      change_id: 'Iad9dc96274af6946f3632be53b106ef80f7ba6ca',
      owner: {
        _account_id: 1019328,
      },
      revisions: {
        rev1: {
          _number: 1,
          push_certificate: {
            key: {
              status: 'TRUSTED',
            },
          },
        },
      },
      current_revision: 'rev1',
      status: 'NEW',
      labels: {},
      mergeable: true,
    };
    const result =
        element._computePushCertificateValidation(serverConfig, change);
    assert.equal(result.message,
        'Push certificate is valid and key is trusted');
    assert.equal(result.icon, 'gr-icons:check');
    assert.equal(result.class, 'trusted');
  });

  test('Push Certificate Validation is missing test', () => {
    const serverConfig = {
      receive: {
        enable_signed_push: true,
      },
    };
    const change = {
      change_id: 'Iad9dc96274af6946f3632be53b106ef80f7ba6ca',
      owner: {
        _account_id: 1019328,
      },
      revisions: {
        rev1: {
          _number: 1,
        },
      },
      current_revision: 'rev1',
      status: 'NEW',
      labels: {},
      mergeable: true,
    };
    const result =
        element._computePushCertificateValidation(serverConfig, change);
    assert.equal(result.message,
        'This patch set was created without a push certificate');
    assert.equal(result.icon, 'gr-icons:help');
    assert.equal(result.class, 'help');
  });

  test('_computeParents', () => {
    const parents = [{commit: '123', subject: 'abc'}];
    const revision = {commit: {parents}};
    assert.deepEqual(element._computeParents({}, {}), []);
    assert.equal(element._computeParents(null, revision), parents);
    const change = current_revision => {
      return {current_revision, revisions: {456: revision}};
    };
    assert.deepEqual(element._computeParents(change(null), null), []);
    const change_bad_revision = change('789');
    assert.deepEqual(element._computeParents(change_bad_revision, {}), []);
    const change_no_commit = {current_revision: '456', revisions: {456: {}}};
    assert.deepEqual(element._computeParents(change_no_commit, null), []);
    const change_good = change('456');
    assert.equal(element._computeParents(change_good, null), parents);
  });

  test('_currentParents', () => {
    const revision = parent => {
      return {commit: {parents: [{commit: parent, subject: 'abc'}]}};
    };
    element.change = {
      current_revision: '456',
      revisions: {456: revision('111')},
    };
    element.revision = revision('222');
    assert.equal(element._currentParents[0].commit, '222');
    element.revision = revision('333');
    assert.equal(element._currentParents[0].commit, '333');
    element.revision = null;
    assert.equal(element._currentParents[0].commit, '111');
    element.change = {current_revision: null};
    assert.deepEqual(element._currentParents, []);
  });

  test('_computeParentsLabel', () => {
    const parent = {commit: 'abc123', subject: 'My parent commit'};
    assert.equal(element._computeParentsLabel([parent]), 'Parent');
    assert.equal(element._computeParentsLabel([parent, parent]),
        'Parents');
  });

  test('_computeParentListClass', () => {
    const parent = {commit: 'abc123', subject: 'My parent commit'};
    assert.equal(element._computeParentListClass([parent], true),
        'parentList nonMerge current');
    assert.equal(element._computeParentListClass([parent], false),
        'parentList nonMerge notCurrent');
    assert.equal(element._computeParentListClass([parent, parent], false),
        'parentList merge notCurrent');
    assert.equal(element._computeParentListClass([parent, parent], true),
        'parentList merge current');
  });

  test('_showAddTopic', () => {
    assert.isTrue(element._showAddTopic(null, false));
    assert.isTrue(element._showAddTopic({base: {topic: null}}, false));
    assert.isFalse(element._showAddTopic({base: {topic: null}}, true));
    assert.isFalse(element._showAddTopic({base: {topic: 'foo'}}, true));
    assert.isFalse(element._showAddTopic({base: {topic: 'foo'}}, false));
  });

  test('_showTopicChip', () => {
    assert.isFalse(element._showTopicChip(null, false));
    assert.isFalse(element._showTopicChip({base: {topic: null}}, false));
    assert.isFalse(element._showTopicChip({base: {topic: null}}, true));
    assert.isFalse(element._showTopicChip({base: {topic: 'foo'}}, true));
    assert.isTrue(element._showTopicChip({base: {topic: 'foo'}}, false));
  });

  test('_showCherryPickOf', () => {
    assert.isFalse(element._showCherryPickOf(null));
    assert.isFalse(element._showCherryPickOf({
      base: {
        cherry_pick_of_change: null,
        cherry_pick_of_patch_set: null,
      },
    }));
    assert.isTrue(element._showCherryPickOf({
      base: {
        cherry_pick_of_change: 123,
        cherry_pick_of_patch_set: 1,
      },
    }));
  });

  suite('Topic removal', () => {
    let change;
    setup(() => {
      change = {
        _number: 'the number',
        actions: {
          topic: {enabled: false},
        },
        change_id: 'the id',
        topic: 'the topic',
        status: 'NEW',
        submit_type: 'CHERRY_PICK',
        labels: {
          test: {
            all: [{_account_id: 1, name: 'bojack', value: 1}],
            default_value: 0,
            values: [],
          },
        },
        removable_reviewers: [],
      };
    });

    test('_computeTopicReadOnly', () => {
      let mutable = false;
      assert.isTrue(element._computeTopicReadOnly(mutable, change));
      mutable = true;
      assert.isTrue(element._computeTopicReadOnly(mutable, change));
      change.actions.topic.enabled = true;
      assert.isFalse(element._computeTopicReadOnly(mutable, change));
      mutable = false;
      assert.isTrue(element._computeTopicReadOnly(mutable, change));
    });

    test('topic read only hides delete button', () => {
      element.account = {};
      element.change = change;
      flush();
      const button = element.shadowRoot
          .querySelector('gr-linked-chip').shadowRoot
          .querySelector('gr-button');
      assert.isTrue(button.hasAttribute('hidden'));
    });

    test('topic not read only does not hide delete button', () => {
      element.account = {test: true};
      change.actions.topic.enabled = true;
      element.change = change;
      flush();
      const button = element.shadowRoot
          .querySelector('gr-linked-chip').shadowRoot
          .querySelector('gr-button');
      assert.isFalse(button.hasAttribute('hidden'));
    });
  });

  suite('Hashtag removal', () => {
    let change;
    setup(() => {
      change = {
        _number: 'the number',
        actions: {
          hashtags: {enabled: false},
        },
        change_id: 'the id',
        hashtags: ['test-hashtag'],
        status: 'NEW',
        submit_type: 'CHERRY_PICK',
        labels: {
          test: {
            all: [{_account_id: 1, name: 'bojack', value: 1}],
            default_value: 0,
            values: [],
          },
        },
        removable_reviewers: [],
      };
    });

    test('_computeHashtagReadOnly', () => {
      flush();
      let mutable = false;
      assert.isTrue(element._computeHashtagReadOnly(mutable, change));
      mutable = true;
      assert.isTrue(element._computeHashtagReadOnly(mutable, change));
      change.actions.hashtags.enabled = true;
      assert.isFalse(element._computeHashtagReadOnly(mutable, change));
      mutable = false;
      assert.isTrue(element._computeHashtagReadOnly(mutable, change));
    });

    test('hashtag read only hides delete button', () => {
      flush();
      element.account = {};
      element.change = change;
      flush();
      const button = element.shadowRoot
          .querySelector('gr-linked-chip').shadowRoot
          .querySelector('gr-button');
      assert.isTrue(button.hasAttribute('hidden'));
    });

    test('hashtag not read only does not hide delete button', () => {
      flush();
      element.account = {test: true};
      change.actions.hashtags.enabled = true;
      element.change = change;
      flush();
      const button = element.shadowRoot
          .querySelector('gr-linked-chip').shadowRoot
          .querySelector('gr-button');
      assert.isFalse(button.hasAttribute('hidden'));
    });
  });

  suite('remove reviewer votes', () => {
    setup(() => {
      sinon.stub(element, '_computeTopicReadOnly').returns(true);
      element.change = {
        _number: 42,
        change_id: 'the id',
        actions: [],
        topic: 'the topic',
        status: 'NEW',
        submit_type: 'CHERRY_PICK',
        labels: {
          test: {
            all: [{_account_id: 1, name: 'bojack', value: 1}],
            default_value: 0,
            values: [],
          },
        },
        removable_reviewers: [],
      };
      flush();
    });

    suite('assignee field', () => {
      const dummyAccount = {
        _account_id: 1,
        name: 'bojack',
      };
      const change = {
        actions: {
          assignee: {enabled: false},
        },
        assignee: dummyAccount,
      };
      let deleteStub;
      let setStub;

      setup(() => {
        deleteStub = sinon.stub(element.$.restAPI, 'deleteAssignee');
        setStub = sinon.stub(element.$.restAPI, 'setAssignee');
        element.serverConfig = {
          change: {
            enable_assignee: true,
          },
        };
      });

      test('changing change recomputes _assignee', () => {
        assert.isFalse(!!element._assignee.length);
        const change = element.change;
        change.assignee = dummyAccount;
        element._changeChanged(change);
        assert.deepEqual(element._assignee[0], dummyAccount);
      });

      test('modifying _assignee calls API', () => {
        assert.isFalse(!!element._assignee.length);
        element.set('_assignee', [dummyAccount]);
        assert.isTrue(setStub.calledOnce);
        assert.deepEqual(element.change.assignee, dummyAccount);
        element.set('_assignee', [dummyAccount]);
        assert.isTrue(setStub.calledOnce);
        element.set('_assignee', []);
        assert.isTrue(deleteStub.calledOnce);
        assert.equal(element.change.assignee, undefined);
        element.set('_assignee', []);
        assert.isTrue(deleteStub.calledOnce);
      });

      test('_computeAssigneeReadOnly', () => {
        let mutable = false;
        assert.isTrue(element._computeAssigneeReadOnly(mutable, change));
        mutable = true;
        assert.isTrue(element._computeAssigneeReadOnly(mutable, change));
        change.actions.assignee.enabled = true;
        assert.isFalse(element._computeAssigneeReadOnly(mutable, change));
        mutable = false;
        assert.isTrue(element._computeAssigneeReadOnly(mutable, change));
      });
    });

    test('changing topic', () => {
      const newTopic = 'the new topic';
      sinon.stub(element.$.restAPI, 'setChangeTopic').returns(
          Promise.resolve(newTopic));
      element._handleTopicChanged({detail: newTopic});
      const topicChangedSpy = sinon.spy();
      element.addEventListener('topic-changed', topicChangedSpy);
      assert.isTrue(element.$.restAPI.setChangeTopic.calledWith(
          42, newTopic));
      return element.$.restAPI.setChangeTopic.lastCall.returnValue
          .then(() => {
            assert.equal(element.change.topic, newTopic);
            assert.isTrue(topicChangedSpy.called);
          });
    });

    test('topic removal', () => {
      sinon.stub(element.$.restAPI, 'setChangeTopic').returns(
          Promise.resolve());
      const chip = element.shadowRoot
          .querySelector('gr-linked-chip');
      const remove = chip.$.remove;
      const topicChangedSpy = sinon.spy();
      element.addEventListener('topic-changed', topicChangedSpy);
      MockInteractions.tap(remove);
      assert.isTrue(chip.disabled);
      assert.isTrue(element.$.restAPI.setChangeTopic.calledWith(
          42, null));
      return element.$.restAPI.setChangeTopic.lastCall.returnValue
          .then(() => {
            assert.isFalse(chip.disabled);
            assert.equal(element.change.topic, '');
            assert.isTrue(topicChangedSpy.called);
          });
    });

    test('changing hashtag', () => {
      flush();
      element._newHashtag = 'new hashtag';
      const newHashtag = ['new hashtag'];
      sinon.stub(element.$.restAPI, 'setChangeHashtag').returns(
          Promise.resolve(newHashtag));
      element._handleHashtagChanged({}, 'new hashtag');
      assert.isTrue(element.$.restAPI.setChangeHashtag.calledWith(
          42, {add: ['new hashtag']}));
      return element.$.restAPI.setChangeHashtag.lastCall.returnValue
          .then(() => {
            assert.equal(element.change.hashtags, newHashtag);
          });
    });
  });

  test('editTopic', () => {
    element.account = {test: true};
    element.change = {actions: {topic: {enabled: true}}};
    flush();

    const label = element.shadowRoot
        .querySelector('.topicEditableLabel');
    assert.ok(label);
    sinon.stub(label, 'open');
    element.editTopic();
    flush();

    assert.isTrue(label.open.called);
  });

  suite('plugin endpoints', () => {
    test('endpoint params', done => {
      element.change = {labels: {}};
      element.revision = {};
      let hookEl;
      let plugin;
      pluginApi.install(
          p => {
            plugin = p;
            plugin.hook('change-metadata-item').getLastAttached()
                .then(el => hookEl = el);
          },
          '0.1',
          'http://some/plugins/url.html');
      getPluginLoader().loadPlugins([]);
      flush(() => {
        assert.strictEqual(hookEl.plugin, plugin);
        assert.strictEqual(hookEl.change, element.change);
        assert.strictEqual(hookEl.revision, element.revision);
        done();
      });
    });
  });
});