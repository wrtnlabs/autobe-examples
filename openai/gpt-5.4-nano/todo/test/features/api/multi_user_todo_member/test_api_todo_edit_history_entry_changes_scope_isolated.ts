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
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";

export async function test_api_todo_edit_history_entry_changes_scope_isolated(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const todoLike = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
          tags.MinLength<1>,
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todoLike);
  const edit1EditedAt = new Date().toISOString();
  const edit1 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todoLike.id,
      body: {
        edited_at: edit1EditedAt,
        changes: null,
      } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
    },
  );
  typia.assert(edit1);
  const edit2EditedAt = new Date(Date.now() + 10).toISOString();
  const edit2 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todoLike.id,
      body: {
        edited_at: edit2EditedAt,
        changes: null,
      } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
    },
  );
  typia.assert(edit2);
  const fetchedE1 =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.at(
      memberConnection,
      {
        todoId: todoLike.id,
        editHistoryEntryId: edit1.id,
      },
    );
  typia.assert(fetchedE1);
  TestValidator.equals(
    "edit history entry id matches E1",
    fetchedE1.id,
    edit1.id,
  );
  TestValidator.equals(
    "fetched changes equal E1 changes",
    fetchedE1.changes,
    edit1.changes,
  );
  TestValidator.notEquals(
    "fetched changes differ from E2 changes",
    fetchedE1.changes,
    edit2.changes,
  );
}
