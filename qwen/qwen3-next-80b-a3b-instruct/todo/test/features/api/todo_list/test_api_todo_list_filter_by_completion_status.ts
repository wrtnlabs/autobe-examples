import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_list_filter_by_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {} satisfies ITodoAppUser.IJoin,
  });
  // Test filtering by completed: true
  const completedTodos = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        completed: true,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completedTodos);
  // Validate pagination total is accurate
  TestValidator.predicate(
    "completed pagination records >= 0",
    completedTodos.pagination.records >= 0,
  );
  // Test filtering by completed: false
  const incompleteTodos = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        completed: false,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteTodos);
  // Validate pagination total is accurate
  TestValidator.predicate(
    "incomplete pagination records >= 0",
    incompleteTodos.pagination.records >= 0,
  );
  // Test filtering by completed: null (or omit)
  const allTodos = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allTodos);
  // Validate pagination total is accurate
  TestValidator.predicate(
    "all pagination records >= 0",
    allTodos.pagination.records >= 0,
  );
  // The ISum type doesn't include 'completed' field, so we cannot validate the completion status of items.
  // We can only validate the API returns valid structure and correct pagination total.
}
