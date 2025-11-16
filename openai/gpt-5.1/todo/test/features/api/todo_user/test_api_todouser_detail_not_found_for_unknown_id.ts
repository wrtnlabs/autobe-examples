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
 * Validate that requesting a todo user detail with an unknown UUID results in
 * an error instead of a successful payload.
 *
 * Business context:
 *
 * - Only authenticated todoAdmin actors may call administrative todo user detail
 *   endpoints.
 * - When a todoAdmin queries a todo user by its UUID primary key and no such user
 *   exists, the service must fail rather than returning a valid
 *   ITodoAppTodoUser record.
 *
 * Steps:
 *
 * 1. Register a new todoAdmin using /auth/todoAdmin/join to establish an
 *    authenticated context.
 *
 *    - The SDK will automatically attach the issued access token to the shared
 *         connection.
 * 2. Create at least one Todo status via /todoApp/todoAdmin/todoStatuses to
 *    simulate realistic admin configuration.
 * 3. Generate a random UUID that is highly unlikely to correspond to any existing
 *    todo user.
 * 4. Call GET /todoApp/todoAdmin/todoUsers/{todoUserId} with this random UUID.
 * 5. Assert that the call fails by throwing an error, ensuring no successful
 *    ITodoAppTodoUser payload is produced for an unknown todoUserId.
 */
export async function test_api_todouser_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin to obtain an authorized context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create at least one Todo status to keep system configuration realistic.
  const statusBody = {
    code: `STATUS_${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusBody,
    });
  typia.assert<ITodoAppTodoStatus>(status);

  // 3. Generate a random UUID that is highly unlikely to match an existing todo user.
  const unknownTodoUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4 & 5. Request todo user detail for the unknown id and validate that the call fails.
  await TestValidator.error(
    "requesting non-existent todo user must result in an error",
    async () => {
      await api.functional.todoApp.todoAdmin.todoUsers.at(connection, {
        todoUserId: unknownTodoUserId,
      });
    },
  );
}
