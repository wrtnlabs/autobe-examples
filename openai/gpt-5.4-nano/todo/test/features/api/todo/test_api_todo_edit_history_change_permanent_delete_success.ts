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

export async function test_api_todo_edit_history_change_permanent_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2) Create a member-owned todo (SDK typing returns IMultiUserTodoEditHistoryEntry)
  const todo = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: typia.random<string & tags.MinLength<1>>(),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todo);
  // 3) Create an edit history entry for that todo
  const editHistoryEntry =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_create(
      memberConnection,
      {
        params: { todoId: todo.id },
      },
    );
  typia.assert(editHistoryEntry);
  const editHistoryEntryId = editHistoryEntry.id;
  // 4) Create a field-level change record for that edit history entry
  const change =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes(
      memberConnection,
      {
        params: {
          todoId: todo.id,
          editHistoryEntryId,
        },
      },
    );
  typia.assert(change);
  // 5) Permanently delete the change
  await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.erase(
    memberConnection,
    {
      todoId: todo.id,
      editHistoryEntryId,
      changeId: change.id,
    },
  );
  // 6) Validate edit history entry is still retrievable (read side)
  const page =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(page);
  const foundEdit = page.data.find((x) => x.id === editHistoryEntryId);
  TestValidator.predicate(
    "edit history entry should remain present",
    () => foundEdit !== undefined,
  );
}
