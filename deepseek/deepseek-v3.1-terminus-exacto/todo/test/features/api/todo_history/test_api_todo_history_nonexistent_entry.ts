import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todo_history_nonexistent_entry(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create a todo for context
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Test invalid UUID format - malformed UUID that doesn't match format
  await TestValidator.httpError(
    "malformed UUID should return 404",
    [404],
    async () => {
      await api.functional.todoApp.user.todos.history.at(userConnection, {
        todoId: todo.id,
        historyId: "not-a-valid-uuid-format" satisfies string as string &
          tags.Format<"uuid">,
      });
    },
  );
  // Test valid UUID format but non-existent history entry
  await TestValidator.httpError(
    "non-existent history entry should return 404",
    [404],
    async () => {
      await api.functional.todoApp.user.todos.history.at(userConnection, {
        todoId: todo.id,
        historyId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // Test non-existent todo ID with valid UUID
  await TestValidator.httpError(
    "non-existent todo should return 404",
    [404],
    async () => {
      await api.functional.todoApp.user.todos.history.at(userConnection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
        historyId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
