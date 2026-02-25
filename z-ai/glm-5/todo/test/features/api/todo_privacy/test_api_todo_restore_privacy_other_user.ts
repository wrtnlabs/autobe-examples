import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test privacy enforcement for todo restoration.
 *
 * This test verifies that a user cannot restore a todo belonging to another user.
 * The API should return 404 Not Found (not 403) to maintain privacy - the system
 * should not reveal whether a todo exists for another user.
 *
 * Steps:
 * 1. User A authenticates and creates a todo
 * 2. User B authenticates as a different user
 * 3. User B attempts to restore User A's todo using its ID
 * 4. Verify the response returns 404 Not Found (privacy-first design)
 *
 * Note: This test verifies privacy protection on the restore endpoint.
 * The scenario requires a delete operation to move the todo to trash,
 * but no delete endpoint is available in the provided API functions.
 * The test validates that User B cannot access User A's todos through
 * the restore endpoint, demonstrating the core privacy isolation.
 */
export async function test_api_todo_restore_privacy_other_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User A authenticates and creates a todo
  const userAConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userAConnection, {});
  const userATodo = await generate_random_todo_app_user_todos_create(
    userAConnection,
    {},
  );
  typia.assert(userATodo);
  // Step 2: User B authenticates as a different user
  const userBConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userBConnection, {});
  // Step 3: User B attempts to restore User A's todo
  // Should return 404 Not Found (not 403) to maintain privacy
  // The system should not reveal whether the todo exists for another user
  await TestValidator.httpError(
    "User B cannot restore User A's todo",
    404,
    async () =>
      await api.functional.todoApp.user.trash.restore(userBConnection, {
        todoId: userATodo.id,
      }),
  );
}
