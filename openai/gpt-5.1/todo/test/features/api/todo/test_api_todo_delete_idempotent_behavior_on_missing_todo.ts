import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";

/**
 * Validate idempotent delete behavior for missing Todo items.
 *
 * Business purpose
 *
 * - Ensure that an authenticated todoUser can safely call DELETE
 *   /todoApp/todoUser/todos/{todoId} even when the target Todo does not exist.
 * - Confirm that repeated deletes on the same non-existing todoId behave
 *   consistently and do not cause unexpected failures from the SDK
 *   perspective.
 *
 * High-level steps
 *
 * 1. Register and authenticate a new todoUser via POST /auth/todoUser/join.
 * 2. Generate a random UUID to be used as a non-existing todoId.
 * 3. Call DELETE /todoApp/todoUser/todos/{todoId} with that todoId once.
 * 4. Call the same DELETE again with the same todoId to simulate idempotent
 *    behavior on a missing resource.
 * 5. Assert that both operations complete without throwing and that the join
 *    response matches ITodoAppTodoUser.IAuthorized.
 */
export async function test_api_todo_delete_idempotent_behavior_on_missing_todo(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new todoUser
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinRequest,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(authorized);

  // Basic sanity check on user status and token
  TestValidator.predicate(
    "todoUser status should be a non-empty string",
    !!authorized.status && authorized.status.length > 0,
  );
  TestValidator.predicate(
    "todoUser token.access should be non-empty",
    !!authorized.token.access && authorized.token.access.length > 0,
  );

  // 2. Generate a random UUID for a likely non-existing Todo
  const missingTodoId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. First delete attempt on the missing Todo
  await api.functional.todoApp.todoUser.todos.erase(connection, {
    todoId: missingTodoId,
  });

  // If we reached here, the first delete did not throw.
  TestValidator.predicate(
    "first delete on missing todoId completes without throwing",
    true,
  );

  // 4. Second delete attempt on the same missing Todo (idempotence check)
  await api.functional.todoApp.todoUser.todos.erase(connection, {
    todoId: missingTodoId,
  });

  TestValidator.predicate(
    "second delete on the same missing todoId also completes without throwing",
    true,
  );
}
