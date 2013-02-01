// Copyright (C) 2008 The Android Open Source Project
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

package com.google.gerrit.client.admin;

import com.google.gerrit.client.Dispatcher;
import com.google.gerrit.client.Gerrit;
import com.google.gerrit.client.VoidResult;
import com.google.gerrit.client.groups.GroupApi;
import com.google.gerrit.client.groups.GroupInfo;
import com.google.gerrit.client.groups.GroupList;
import com.google.gerrit.client.groups.MemberInfo;
import com.google.gerrit.client.groups.MemberList;
import com.google.gerrit.client.rpc.GerritCallback;
import com.google.gerrit.client.ui.AccountGroupSuggestOracle;
import com.google.gerrit.client.ui.AccountLink;
import com.google.gerrit.client.ui.AddMemberBox;
import com.google.gerrit.client.ui.FancyFlexTable;
import com.google.gerrit.client.ui.Hyperlink;
import com.google.gerrit.client.ui.SmallHeading;
import com.google.gerrit.common.data.AccountInfoCache;
import com.google.gerrit.common.data.GroupDetail;
import com.google.gerrit.reviewdb.client.Account;
import com.google.gerrit.reviewdb.client.AccountGroup;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.user.client.ui.Anchor;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.CheckBox;
import com.google.gwt.user.client.ui.FlexTable.FlexCellFormatter;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.Panel;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;

public class AccountGroupMembersScreen extends AccountGroupScreen {

  private AccountInfoCache accounts = AccountInfoCache.empty();
  private MemberTable members;
  private IncludeTable includes;

  private Panel memberPanel;
  private AddMemberBox addMemberBox;
  private Button delMember;

  private Panel includePanel;
  private AddMemberBox addIncludeBox;
  private Button delInclude;

  private FlowPanel noMembersInfo;

  public AccountGroupMembersScreen(final GroupDetail toShow, final String token) {
    super(toShow, token);
  }

  @Override
  protected void onInitUI() {
    super.onInitUI();
    initMemberList();
    initIncludeList();
    initNoMembersInfo();
  }

  private void enableForm(final boolean canModify) {
    addMemberBox.setEnabled(canModify);
    members.setEnabled(canModify);
    addIncludeBox.setEnabled(canModify);
    includes.setEnabled(canModify);
  }


  private void initMemberList() {
    addMemberBox = new AddMemberBox();

    addMemberBox.addClickHandler(new ClickHandler() {
      @Override
      public void onClick(final ClickEvent event) {
        doAddNewMember();
      }
    });

    members = new MemberTable();
    members.addStyleName(Gerrit.RESOURCES.css().groupMembersTable());

    delMember = new Button(Util.C.buttonDeleteGroupMembers());
    delMember.addClickHandler(new ClickHandler() {
      @Override
      public void onClick(final ClickEvent event) {
        members.deleteChecked();
      }
    });

    memberPanel = new FlowPanel();
    memberPanel.add(new SmallHeading(Util.C.headingMembers()));
    memberPanel.add(addMemberBox);
    memberPanel.add(members);
    memberPanel.add(delMember);
    add(memberPanel);
  }

  private void initIncludeList() {
    addIncludeBox =
        new AddMemberBox(Util.C.buttonAddIncludedGroup(),
            Util.C.defaultAccountGroupName(), new AccountGroupSuggestOracle());

    addIncludeBox.addClickHandler(new ClickHandler() {
      @Override
      public void onClick(final ClickEvent event) {
        doAddNewInclude();
      }
    });

    includes = new IncludeTable();
    includes.addStyleName(Gerrit.RESOURCES.css().groupIncludesTable());

    delInclude = new Button(Util.C.buttonDeleteIncludedGroup());
    delInclude.addClickHandler(new ClickHandler() {
      @Override
      public void onClick(final ClickEvent event) {
        includes.deleteChecked();
      }
    });

    includePanel = new FlowPanel();
    includePanel.add(new SmallHeading(Util.C.headingIncludedGroups()));
    includePanel.add(addIncludeBox);
    includePanel.add(includes);
    includePanel.add(delInclude);
    add(includePanel);
  }

  private void initNoMembersInfo() {
    noMembersInfo = new FlowPanel();
    noMembersInfo.setVisible(false);
    noMembersInfo.add(new SmallHeading(Util.C.noMembersInfo()));
    add(noMembersInfo);
  }

  @Override
  protected void display(final GroupDetail groupDetail) {
    switch (groupDetail.group.getType()) {
      case INTERNAL:
        accounts = groupDetail.accounts;

        MemberList.all(getGroupUUID(), new GerritCallback<MemberList>() {
          @Override
          public void onSuccess(MemberList result) {
            members.display(result.asList());
          }
        });

        GroupList.included(getGroupUUID(), new GerritCallback<GroupList>() {
          @Override
          public void onSuccess(GroupList result) {
            includes.display(result.asList());
          }
        });

        break;
      default:
        memberPanel.setVisible(false);
        includePanel.setVisible(false);
        noMembersInfo.setVisible(true);
        break;
    }

    enableForm(groupDetail.canModify);
    delMember.setVisible(groupDetail.canModify);
    delInclude.setVisible(groupDetail.canModify);
  }

  void doAddNewMember() {
    final String nameEmail = addMemberBox.getText();
    if (nameEmail.length() == 0) {
      return;
    }

    addMemberBox.setEnabled(false);
    GroupApi.addMember(getGroupUUID(), nameEmail,
        new GerritCallback<MemberInfo>() {
          public void onSuccess(final MemberInfo memberInfo) {
            Gerrit.display(Dispatcher.toGroup(getGroupUUID(), AccountGroupScreen.MEMBERS));
          }

          @Override
          public void onFailure(final Throwable caught) {
            addMemberBox.setEnabled(true);
            super.onFailure(caught);
          }
        });
  }

  void doAddNewInclude() {
    final String groupName = addIncludeBox.getText();
    if (groupName.length() == 0) {
      return;
    }

    addIncludeBox.setEnabled(false);
    GroupApi.addIncludedGroup(getGroupUUID(), groupName,
        new GerritCallback<GroupInfo>() {
          public void onSuccess(final GroupInfo result) {
            addIncludeBox.setEnabled(true);
            addIncludeBox.setText("");
            includes.insert(result);
          }

          @Override
          public void onFailure(final Throwable caught) {
            addIncludeBox.setEnabled(true);
            super.onFailure(caught);
          }
        });
  }

  private class MemberTable extends FancyFlexTable<MemberInfo> {
    private boolean enabled = true;

    MemberTable() {
      table.setText(0, 2, Util.C.columnMember());
      table.setText(0, 3, Util.C.columnEmailAddress());

      final FlexCellFormatter fmt = table.getFlexCellFormatter();
      fmt.addStyleName(0, 1, Gerrit.RESOURCES.css().iconHeader());
      fmt.addStyleName(0, 2, Gerrit.RESOURCES.css().dataHeader());
      fmt.addStyleName(0, 3, Gerrit.RESOURCES.css().dataHeader());
    }

    void setEnabled(final boolean enabled) {
      this.enabled = enabled;
      for (int row = 1; row < table.getRowCount(); row++) {
        final MemberInfo i = getRowItem(row);
        if (i != null) {
          ((CheckBox) table.getWidget(row, 1)).setEnabled(enabled);
        }
      }
    }

    void deleteChecked() {
      final HashSet<Account.Id> ids = new HashSet<Account.Id>();
      for (int row = 1; row < table.getRowCount(); row++) {
        final MemberInfo i = getRowItem(row);
        if (i != null && ((CheckBox) table.getWidget(row, 1)).getValue()) {
          ids.add(i.getAccountId());
        }
      }
      if (!ids.isEmpty()) {
        GroupApi.removeMembers(getGroupUUID(), ids,
            new GerritCallback<VoidResult>() {
              public void onSuccess(final VoidResult result) {
                for (int row = 1; row < table.getRowCount();) {
                  final MemberInfo i = getRowItem(row);
                  if (i != null && ids.contains(i.getAccountId())) {
                    table.removeRow(row);
                  } else {
                    row++;
                  }
                }
              }
            });
      }
    }

    void display(final List<MemberInfo> result) {
      while (1 < table.getRowCount())
        table.removeRow(table.getRowCount() - 1);

      for (final MemberInfo i : result) {
        final int row = table.getRowCount();
        table.insertRow(row);
        applyDataRowStyle(row);
        populate(row, i);
      }
    }

    void populate(final int row, final MemberInfo i) {
      final Account.Id accountId = i.getAccountId();
      CheckBox checkBox = new CheckBox();
      table.setWidget(row, 1, checkBox);
      checkBox.setEnabled(enabled);
      table.setWidget(row, 2, AccountLink.link(accounts, accountId));
      table.setText(row, 3, accounts.get(accountId).getPreferredEmail());

      final FlexCellFormatter fmt = table.getFlexCellFormatter();
      fmt.addStyleName(row, 1, Gerrit.RESOURCES.css().iconCell());
      fmt.addStyleName(row, 2, Gerrit.RESOURCES.css().dataCell());
      fmt.addStyleName(row, 3, Gerrit.RESOURCES.css().dataCell());

      setRowItem(row, i);
    }
  }

  private class IncludeTable extends FancyFlexTable<GroupInfo> {
    private boolean enabled = true;

    IncludeTable() {
      table.setText(0, 2, Util.C.columnGroupName());
      table.setText(0, 3, Util.C.columnGroupDescription());

      final FlexCellFormatter fmt = table.getFlexCellFormatter();
      fmt.addStyleName(0, 1, Gerrit.RESOURCES.css().iconHeader());
      fmt.addStyleName(0, 2, Gerrit.RESOURCES.css().dataHeader());
      fmt.addStyleName(0, 3, Gerrit.RESOURCES.css().dataHeader());
    }

    void setEnabled(final boolean enabled) {
      this.enabled = enabled;
      for (int row = 1; row < table.getRowCount(); row++) {
        final GroupInfo i = getRowItem(row);
        if (i != null) {
          ((CheckBox) table.getWidget(row, 1)).setEnabled(enabled);
        }
      }
    }

    void deleteChecked() {
      final HashSet<AccountGroup.UUID> ids = new HashSet<AccountGroup.UUID>();
      for (int row = 1; row < table.getRowCount(); row++) {
        final GroupInfo i = getRowItem(row);
        if (i != null && ((CheckBox) table.getWidget(row, 1)).getValue()) {
          ids.add(i.getGroupUUID());
        }
      }
      if (!ids.isEmpty()) {
        GroupApi.removeIncludedGroups(getGroupUUID(), ids,
            new GerritCallback<VoidResult>() {
              public void onSuccess(final VoidResult result) {
                for (int row = 1; row < table.getRowCount();) {
                  final GroupInfo i = getRowItem(row);
                  if (i != null && ids.contains(i.getGroupUUID())) {
                    table.removeRow(row);
                  } else {
                    row++;
                  }
                }
              }
            });
      }
    }

    void display(List<GroupInfo> list) {
      while (1 < table.getRowCount())
        table.removeRow(table.getRowCount() - 1);

      for (final GroupInfo i : list) {
        final int row = table.getRowCount();
        table.insertRow(row);
        applyDataRowStyle(row);
        populate(row, i);
      }
    }

    void insert(GroupInfo info) {
      Comparator<GroupInfo> c = new Comparator<GroupInfo>() {
        @Override
        public int compare(GroupInfo a, GroupInfo b) {
          int cmp = nullToEmpty(a.name()).compareTo(nullToEmpty(b.name()));
          if (cmp != 0) {
            return cmp;
          }
          return a.getGroupUUID().compareTo(b.getGroupUUID());
        }

        public String nullToEmpty(String str) {
          return str == null ? "" : str;
        }
      };
      for (int row = 1; row < table.getRowCount(); row++) {
        final GroupInfo i = getRowItem(row);
        if (i != null) {
          if (c.compare(info, i) < 0) {
            table.insertRow(row);
            applyDataRowStyle(row);
            populate(row, info);
            return;
          }
        }
      }

      final int row = table.getRowCount();
      table.insertRow(row);
      applyDataRowStyle(row);
      populate(row, info);
    }

    void populate(final int row, final GroupInfo i) {
      final FlexCellFormatter fmt = table.getFlexCellFormatter();

      AccountGroup.UUID uuid = i.getGroupUUID();
      CheckBox checkBox = new CheckBox();
      table.setWidget(row, 1, checkBox);
      checkBox.setEnabled(enabled);
      if (AccountGroup.isInternalGroup(uuid)) {
        table.setWidget(row, 2,
            new Hyperlink(i.name(), Dispatcher.toGroup(uuid)));
        fmt.getElement(row, 2).setTitle(null);
        table.setText(row, 3, i.description());
      } else if (i.url() != null) {
        Anchor a = new Anchor();
        a.setText(i.name());
        a.setHref(i.url());
        a.setTitle("UUID " + uuid.get());
        table.setWidget(row, 2, a);
        fmt.getElement(row, 2).setTitle(null);
      } else {
        table.setText(row, 2, i.name());
        fmt.getElement(row, 2).setTitle("UUID " + uuid.get());
      }

      fmt.addStyleName(row, 1, Gerrit.RESOURCES.css().iconCell());
      fmt.addStyleName(row, 2, Gerrit.RESOURCES.css().dataCell());
      fmt.addStyleName(row, 3, Gerrit.RESOURCES.css().dataCell());

      setRowItem(row, i);
    }
  }
}
