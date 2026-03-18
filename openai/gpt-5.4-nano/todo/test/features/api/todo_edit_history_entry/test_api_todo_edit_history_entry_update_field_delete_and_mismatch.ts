import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { generate_random_multi_user_todo_member_todos_edit_history_entries_create } from "../../../generate/generate_random_multi_user_todo_member_todos_edit_history_entries_create";
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";

export async function test_api_todo_edit_history_entry_update_field_delete_and_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });

  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { ...(memberConnection.headers ?? {}) };

  // Create two todos for mismatch scenario.
  const todo1 = await generate_random_multi_user_todo_member_todos_create(
    userConnection,
    {},
  );
  typia.assert(todo1);
  const todo2 = await generate_random_multi_user_todo_member_todos_create(
    userConnection,
    {},
  );
  typia.assert(todo2);

  // Create one edit history entry per todo.
  const todo1Edit =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_create(
      userConnection,
      { params: { todoId: todo1.id } },
    );
  typia.assert(todo1Edit);

  const todo2Edit =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_create(
      userConnection,
      { params: { todoId: todo2.id } },
    );
  typia.assert(todo2Edit);

  // Scenario 1: update a field-level change so toValue becomes null.
  const targetChange = todo1Edit.changes[0];
  typia.assert(targetChange);

  const editedAtToNull = new Date(Date.now() + 60 * 1000).toISOString();

  const body1 = typia.assert<IMultiUserTodoEditHistoryEntry.IUpdate>({
    edited_at: editedAtToNull satisfies string & tags.Format<"date-time">,
    changes: [
      {
        ...targetChange,
        toValue: null,
      },
    ],
  });

  const updated1 = await api.functional.multiUserTodo.member.todos.editHistoryEntries.update(
    userConnection,
    {
      todoId: todo1.id,
      editHistoryEntryId: todo1Edit.id,
      body: body1,
    },
  );
  typia.assert(updated1);

  const updatedTarget = updated1.changes.find(
    (c) => c.changedField === targetChange.changedField,
  );
  if (!updatedTarget) throw new Error("updated change not found");
  TestValidator.equals("toValue becomes null", updatedTarget.toValue, null);

  // Scenario 2: mismatch route params (todoId vs editHistoryEntryId).
  await TestValidator.error(
    "reject mismatched editHistoryEntryId for different todo",
    async () => {
      const body2 = typia.assert<IMultiUserTodoEditHistoryEntry.IUpdate>({
        edited_at: new Date(Date.now() + 120 * 1000).toISOString(),
        changes: [
          {
            ...targetChange,
            toValue: null,
          },
        ],
      });

      await api.functional.multiUserTodo.member.todos.editHistoryEntries.update(
        userConnection,
        {
          todoId: todo1.id,
          editHistoryEntryId: todo2Edit.id,
          body: body2,
        },
      );
    },
  );
}
