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

export async function test_api_todo_history_entry_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join (auth)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // Actor-specific connection (token already stored in memberConnection.headers)
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = memberConnection.headers ?? {};
  // 2) Create todo
  const todo: ITodoAppTodo = await generate_random_todo_app_member_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3) Create two history entries
  const history1: ITodoAppTodoHistoryEntry =
    await generate_random_todo_app_member_todos_history_create_todo_history_entry(
      userConnection,
      {
        params: { todoId: todo.id },
        body: {
          changedTitle: "history-1-" + RandomGenerator.alphabets(10),
          changedDescription: null,
          changedStartDate: null,
          changedDueDate: null,
          changedCompletionStatus: null,
        } satisfies ITodoAppTodoHistoryEntry.ICreate,
      },
    );
  typia.assert(history1);
  const history2: ITodoAppTodoHistoryEntry =
    await generate_random_todo_app_member_todos_history_create_todo_history_entry(
      userConnection,
      {
        params: { todoId: todo.id },
        body: {
          changedTitle: "history-2-" + RandomGenerator.alphabets(10),
          changedDescription: null,
          changedStartDate: null,
          changedDueDate: null,
          changedCompletionStatus: null,
        } satisfies ITodoAppTodoHistoryEntry.ICreate,
      },
    );
  typia.assert(history2);
  // 4) Erase first history entry
  await api.functional.todoApp.member.todos.history.erase(userConnection, {
    todoId: todo.id,
    historyEntryId: history1.id,
  });
  // 5) Repeating delete should fail (permanent removal)
  await TestValidator.httpError(
    "repeated erase should fail",
    [400, 401, 403, 404, 410],
    async () => {
      await api.functional.todoApp.member.todos.history.erase(userConnection, {
        todoId: todo.id,
        historyEntryId: history1.id,
      });
    },
  );
  // 6) Ensure other history entries unaffected: erase second should still succeed
  await api.functional.todoApp.member.todos.history.erase(userConnection, {
    todoId: todo.id,
    historyEntryId: history2.id,
  });
}
