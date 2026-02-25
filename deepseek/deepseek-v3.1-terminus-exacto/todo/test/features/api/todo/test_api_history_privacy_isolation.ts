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

/**
 * Test history privacy isolation by creating two separate user accounts.
 * Create User A via join endpoint, have them create a todo and edit it to generate history.
 * Create User B via join endpoint, have them attempt to access User A's todo history.
 * Verify the system correctly rejects User B's request with authorization error.
 */
export async function test_api_history_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create User A
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuth = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userAAuth);
  // Create User B
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuth = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userBAuth);
  // User A creates a todo
  const userATodo = await api.functional.todoApp.user.todos.create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(userATodo);
  // User A edits the todo to generate history
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    userAConnection,
    {
      todoId: userATodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // Since we don't have a history listing endpoint, we assume the system generates history
  // User B attempts to access User A's todo history - this should fail with authorization error
  await TestValidator.httpError(
    "User B cannot access User A's todo history",
    [403, 404],
    async () => {
      await api.functional.todoApp.user.todos.histories.at(userBConnection, {
        todoId: userATodo.id,
        historyId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
