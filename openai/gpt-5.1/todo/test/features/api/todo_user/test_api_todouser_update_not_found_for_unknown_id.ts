import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

/**
 * Validate that updating a non-existent todo user account by UUID fails without
 * creating or modifying any records.
 *
 * Business context:
 *
 * - TodoAdmin actors manage todo user accounts through the
 *   `/todoApp/todoAdmin/todoUsers/{todoUserId}` endpoint.
 * - The update operation is documented to return a 404-style error when the
 *   provided `todoUserId` does not correspond to any row in
 *   `todo_app_todousers`.
 * - This test ensures that behavior by attempting to update a random UUID that
 *   (with overwhelming probability) does not exist.
 *
 * Test steps:
 *
 * 1. Register a new todoAdmin via /auth/todoAdmin/join and obtain an authenticated
 *    admin context (handled automatically by the SDK).
 * 2. Create a baseline Todo status via /todoApp/todoAdmin/todoStatuses to keep the
 *    configuration realistic for todo-related workflows.
 * 3. Generate a random UUID to act as an unknown todo user id.
 * 4. As the authenticated todoAdmin, call PUT
 *    /todoApp/todoAdmin/todoUsers/{todoUserId} with that random UUID and a
 *    valid ITodoAppTodoUser.IUpdate payload.
 * 5. Assert that the operation fails by using TestValidator.error, confirming that
 *    updating a non-existent todo user id does not succeed.
 *
 * Notes:
 *
 * - The SDK does not expose any listing or GET endpoint for todo users in the
 *   provided materials, so we cannot explicitly check that no new user record
 *   was created. Instead, we trust the documented contract that a missing id
 *   yields a 404-style error and only assert that the update call fails.
 * - We do not inspect HTTP status codes, in accordance with global rules that
 *   forbid status-code assertions. The presence of an error is sufficient
 *   signal that the not-found behavior occurred.
 */
export async function test_api_todouser_update_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin and obtain an authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-1234",
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // 2. Create a baseline Todo status to keep configuration realistic
  const statusCreateBody = {
    code: RandomGenerator.alphabets(8),
    label: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: RandomGenerator.name(1),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert<ITodoAppTodoStatus>(status);

  // 3. Generate a random UUID that is extremely unlikely to exist as a todo user id
  const unknownTodoUserId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare a valid update payload for the todo user
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    display_name: RandomGenerator.name(),
    status: "active",
  } satisfies ITodoAppTodoUser.IUpdate;

  // 5. Attempt the update and assert that it fails with an error
  await TestValidator.error(
    "update non-existent todo user should fail",
    async () => {
      await api.functional.todoApp.todoAdmin.todoUsers.update(connection, {
        todoUserId: unknownTodoUserId,
        body: updateBody,
      });
    },
  );
}
