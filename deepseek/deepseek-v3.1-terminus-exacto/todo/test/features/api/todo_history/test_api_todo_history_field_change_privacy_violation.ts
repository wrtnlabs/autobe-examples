import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import type { ITodoAppTodoHistoryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryChange";
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

export async function test_api_todo_history_field_change_privacy_violation(
  connection: api.IConnection,
): Promise<void> {
  // Create user A and set up their todo with edit history
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuthorized = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userAAuthorized);
  // Create todo for User A
  const todoA = await generate_random_todo_app_user_todos_create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA);
  // Edit todo to generate history and field changes
  const updatedTodoA = await api.functional.todoApp.user.todos.update(
    userAConnection,
    {
      todoId: todoA.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodoA);
  // Create User B
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuthorized = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userBAuthorized);
  // User B attempts to access User A's field change - should fail with authorization error
  await TestValidator.error(
    "User B cannot access User A's field change",
    async () => {
      await api.functional.todoApp.user.todos.histories.changes.at(
        userBConnection,
        {
          todoId: todoA.id,
          historyId: typedRandomUuid(),
          changeId: typedRandomUuid(),
        },
      );
    },
  );
  // Verify error response type
  await TestValidator.httpError(
    "Should return authorization error",
    [404, 403],
    async () => {
      await api.functional.todoApp.user.todos.histories.changes.at(
        userBConnection,
        {
          todoId: todoA.id,
          historyId: typedRandomUuid(),
          changeId: typedRandomUuid(),
        },
      );
    },
  );
}
// Helper function for type-safe UUID generation
function typedRandomUuid(): string & tags.Format<"uuid"> {
  return typia.random<string & tags.Format<"uuid">>();
}
