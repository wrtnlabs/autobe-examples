import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodo";
import type { IPageIMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes } from "../../../generate/generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes";
import { generate_random_multi_user_todo_member_todos_edit_history_entries_create } from "../../../generate/generate_random_multi_user_todo_member_todos_edit_history_entries_create";
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";
import { prepare_random_multi_user_todo_edit_history_entry_change } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry_change";

export async function test_api_todo_edit_history_entry_changes_duplicate_changed_field(
  connection: api.IConnection,
): Promise<void> {
  // 1) member join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      // IMultiUserTodoMember.IJoin defines `password` as boolean in the given DTO
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = memberConnection.headers;
  // 2) create todo (SDK returns IMultiUserTodoEditHistoryEntry DTO)
  const todo = await api.functional.multiUserTodo.member.todos.create(
    authorizedConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todo);
  const todoId = todo.id;
  // 3) create an edit history entry for that todo
  const editHistoryEntry =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.create(
      authorizedConnection,
      {
        todoId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(editHistoryEntry);
  const editHistoryEntryId = editHistoryEntry.id;
  // baseline: read edit history summaries
  const before =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      authorizedConnection,
      {
        todoId,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(before);
  const entryCountBefore = before.data.filter(
    (x) => x.id === editHistoryEntryId,
  ).length;
  TestValidator.equals(
    "edit history entry summary count before duplicate attempt",
    entryCountBefore,
    1,
  );
  // 4) attempt duplicate changedField by calling createChanges twice with same changedField
  const dupField = "title";
  const firstChange =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.createChanges(
      authorizedConnection,
      {
        todoId,
        editHistoryEntryId,
        body: {
          changedField: dupField,
          fromValue: null,
          toValue: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IMultiUserTodoEditHistoryEntryChange.ICreate,
      },
    );
  typia.assert(firstChange);
  await TestValidator.error(
    "should reject duplicate changedField for same editHistoryEntryId",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.createChanges(
        authorizedConnection,
        {
          todoId,
          editHistoryEntryId,
          body: {
            changedField: dupField,
            fromValue: null,
            toValue: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IMultiUserTodoEditHistoryEntryChange.ICreate,
        },
      );
    },
  );
  // 6) verify atomicity: summary count must remain unchanged
  const afterDuplicate =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      authorizedConnection,
      {
        todoId,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(afterDuplicate);
  const entryCountAfterDup = afterDuplicate.data.filter(
    (x) => x.id === editHistoryEntryId,
  ).length;
  TestValidator.equals(
    "edit history entry summary count after duplicate attempt",
    entryCountAfterDup,
    1,
  );
  // 7) happy path contrast: create a different changedField
  const uniqueField = "description";
  const secondChange =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.createChanges(
      authorizedConnection,
      {
        todoId,
        editHistoryEntryId,
        body: {
          changedField: uniqueField,
          fromValue: null,
          toValue: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IMultiUserTodoEditHistoryEntryChange.ICreate,
      },
    );
  typia.assert(secondChange);
  // 8) verify persistence indirectly via successful create responses + summary count
  TestValidator.equals(
    "first duplicate change field matches",
    firstChange.changedField,
    dupField,
  );
  TestValidator.equals(
    "second unique change field matches",
    secondChange.changedField,
    uniqueField,
  );
  const final =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      authorizedConnection,
      {
        todoId,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(final);
  const entryCountFinal = final.data.filter(
    (x) => x.id === editHistoryEntryId,
  ).length;
  TestValidator.equals(
    "edit history entry summary count after unique change",
    entryCountFinal,
    1,
  );
}
