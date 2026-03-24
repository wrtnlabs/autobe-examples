import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { generate_random_todo_app_member_todos_history_create_todo_history_entry } from "../../../generate/generate_random_todo_app_member_todos_history_create_todo_history_entry";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { prepare_random_todo_app_todo_history_entry } from "../../../prepare/prepare_random_todo_app_todo_history_entry";

export async function test_api_todo_history_entry_retrieval_after_permanent_deletion_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2) Create todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
      },
    },
  );
  typia.assert(todo);
  // 3) Create history entry
  const historyEntry =
    await generate_random_todo_app_member_todos_history_create_todo_history_entry(
      memberConnection,
      {
        params: { todoId: todo.id },
        body: {
          changedTitle: "Updated title",
          changedDescription: null,
          changedStartDate: null,
          changedDueDate: null,
          changedCompletionStatus: null,
        },
      },
    );
  typia.assert(historyEntry);
  // 4) Permanently delete the specific history entry
  await api.functional.todoApp.member.todos.history.erase(memberConnection, {
    todoId: todo.id,
    historyEntryId: historyEntry.id,
  });
  // 5) After permanent deletion, retrieving should be rejected
  await TestValidator.error(
    "history entry retrieval should be rejected after permanent deletion",
    async () => {
      await api.functional.todoApp.member.todos.history.at(memberConnection, {
        todoId: todo.id,
        historyEntryId: historyEntry.id,
      });
    },
  );
}
