import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_apiodo_history_null_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create first user
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Auth = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user1Auth);
  // Create todo for user1
  const todo = await generate_random_todo_app_user_todos_create(
    user1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Test empty history immediately after creation
  const emptyHistory = await api.functional.todoApp.user.todos.history.index(
    user1Connection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(emptyHistory);
  // Verify empty history response
  TestValidator.equals("empty history data", emptyHistory.data.length, 0);
  TestValidator.equals(
    "empty history pagination",
    emptyHistory.pagination.records,
    0,
  );
  TestValidator.equals("empty history pages", emptyHistory.pagination.pages, 0);
  // Perform a single edit
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    user1Connection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // Test single-edit history retrieval
  const singleEditHistory =
    await api.functional.todoApp.user.todos.history.index(user1Connection, {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    });
  typia.assert(singleEditHistory);
  // Validate single history entry
  TestValidator.equals(
    "single history entry",
    singleEditHistory.data.length,
    1,
  );
  TestValidator.equals(
    "single history pagination",
    singleEditHistory.pagination.records,
    1,
  );
  TestValidator.equals(
    "single history pages",
    singleEditHistory.pagination.pages,
    1,
  );
  const historyEntry = singleEditHistory.data[0];
  TestValidator.equals(
    "history user matches",
    historyEntry.user.id,
    user1Auth.id,
  );
  TestValidator.equals("history todo matches", historyEntry.todo.id, todo.id);
  TestValidator.predicate(
    "history timestamp valid",
    new Date(historyEntry.created_at).getTime() > 0,
  );
  // Create second user for isolation test
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Auth = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user2Auth);
  // Attempt to access user1's todo history as user2 (should fail)
  await TestValidator.error(
    "user isolation - cannot access other user's history",
    async () => {
      await api.functional.todoApp.user.todos.history.index(user2Connection, {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoHistory.IRequest,
      });
    },
  );
}
