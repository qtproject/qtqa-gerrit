// Copyright (C) 2009 The Android Open Source Project
// Copyright (C) 2012 Digia Plc and/or its subsidiary(-ies).
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.gerrit.httpd.rpc.changedetail;

import com.google.gerrit.common.data.ChangeDetail;
import com.google.gerrit.common.data.ChangeManageService;
import com.google.gerrit.reviewdb.PatchSet;
import com.google.gwt.user.client.rpc.AsyncCallback;
import com.google.inject.Inject;

class ChangeManageServiceImpl implements ChangeManageService {
  private final SubmitAction.Factory submitAction;
  private final AbandonChange.Factory abandonChangeFactory;
  private final DeferChange.Factory deferChangeFactory;
  private final RestoreChange.Factory restoreChangeFactory;
  private final RevertChange.Factory revertChangeFactory;
  private final StagingAction.Factory stagingActionFactory;
  private final UnstageChange.Factory unstageChangeFactory;

  @Inject
  ChangeManageServiceImpl(final SubmitAction.Factory patchSetAction,
      final AbandonChange.Factory abandonChangeFactory,
      final DeferChange.Factory deferChangeFactory,
      final RestoreChange.Factory restoreChangeFactory,
      final RevertChange.Factory revertChangeFactory,
      final StagingAction.Factory stagingActionFactory,
      final UnstageChange.Factory unstageChangeFactory) {
    this.submitAction = patchSetAction;
    this.abandonChangeFactory = abandonChangeFactory;
    this.deferChangeFactory = deferChangeFactory;
    this.restoreChangeFactory = restoreChangeFactory;
    this.revertChangeFactory = revertChangeFactory;
    this.stagingActionFactory = stagingActionFactory;
    this.unstageChangeFactory = unstageChangeFactory;
  }

  public void submit(final PatchSet.Id patchSetId,
      final AsyncCallback<ChangeDetail> cb) {
    submitAction.create(patchSetId).to(cb);
  }

  public void abandonChange(final PatchSet.Id patchSetId, final String message,
      final AsyncCallback<ChangeDetail> callback) {
    abandonChangeFactory.create(patchSetId, message).to(callback);
  }

  public void deferChange(final PatchSet.Id patchSetId, final String message,
      final AsyncCallback<ChangeDetail> callback) {
    deferChangeFactory.create(patchSetId, message).to(callback);
  }

  public void revertChange(final PatchSet.Id patchSetId, final String message,
      final AsyncCallback<ChangeDetail> callback) {
    revertChangeFactory.create(patchSetId, message).to(callback);
  }

  public void restoreChange(final PatchSet.Id patchSetId, final String message,
      final AsyncCallback<ChangeDetail> callback) {
    restoreChangeFactory.create(patchSetId, message).to(callback);
  }

  public void stage(final PatchSet.Id patchSetId,
      final AsyncCallback<ChangeDetail> callback) {
    // Forward call to StagingAction implementation.
    stagingActionFactory.create(patchSetId).to(callback);
  }

  public void unstageChange(final PatchSet.Id patchSetId,
      final AsyncCallback<ChangeDetail> callback) {
    unstageChangeFactory.create(patchSetId).to(callback);
  }
}
