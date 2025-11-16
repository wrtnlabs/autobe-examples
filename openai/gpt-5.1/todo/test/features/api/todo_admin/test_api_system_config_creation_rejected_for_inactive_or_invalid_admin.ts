import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate that system configuration creation is restricted to authenticated
 * todoAdmin accounts.
 *
 * Original intent was to ensure that suspended or otherwise non-active admins
 * are rejected, but the available SDK only exposes /auth/todoAdmin/join for
 * admin lifecycle and does not provide any operation to change an admin’s
 * status. Therefore, this test instead validates the closely related rule that
 * unauthenticated (thus invalid) callers cannot create system configs, while a
 * properly authenticated admin can.
 *
 * Test steps:
 *
 * 1. Join as a new todoAdmin using /auth/todoAdmin/join. This returns an
 *    ITodoAppTodoAdmin.IAuthorized and implicitly sets
 *    connection.headers.Authorization to the admin’s access token.
 * 2. Using this authenticated connection, call POST
 *    /todoApp/todoAdmin/systemConfigs with a valid ITodoAppSystemConfig.ICreate
 *    body and assert that it succeeds and returns a valid
 *    ITodoAppSystemConfig.
 * 3. Derive an unauthenticated connection by shallow-cloning the original
 *    connection but providing an empty headers object. This simulates a client
 *    that has no Authorization header and therefore no valid todoAdmin
 *    context.
 * 4. Using this unauthenticated connection, attempt to create another system
 *    config with a valid ITodoAppSystemConfig.ICreate body and assert, via
 *    TestValidator.httpError, that the call fails with an HTTP 401 or 403 type
 *    status.
 *
 * This verifies that the system configuration creation endpoint enforces
 * authentication for todoAdmin actors and does not allow configuration writes
 * from invalid (unauthenticated) contexts.
 */
export async function test_api_system_config_creation_rejected_for_inactive_or_invalid_admin(
  connection: api.IConnection,
) {
  // 1. Join as a new todoAdmin (authenticated admin context)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.example.com/register",
    referrer: "https://admin.todo-app.example.com/login",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // Sanity check: status field is a non-empty string
  TestValidator.predicate(
    "joined admin has non-empty status",
    () => admin.status.length > 0,
  );

  // 2. Authenticated admin can create a system config
  const createBody1 = {
    scope: "todo",
    key: `max_open_todos_${RandomGenerator.alphaNumeric(6)}`,
    value: "100",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const config1: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: createBody1,
    });
  typia.assert<ITodoAppSystemConfig>(config1);

  TestValidator.equals(
    "authenticated admin can create system config",
    config1.scope,
    createBody1.scope,
  );
  TestValidator.equals(
    "created config key matches request",
    config1.key,
    createBody1.key,
  );
  TestValidator.equals(
    "created config value matches request",
    config1.value,
    createBody1.value,
  );

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to create another system config without authentication and
  //    assert that it fails with an HTTP auth-style error (401 or 403).
  const createBody2 = {
    scope: "todo",
    key: `soft_delete_retention_days_${RandomGenerator.alphaNumeric(6)}`,
    value: "30",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  await TestValidator.httpError(
    "unauthenticated caller cannot create system config",
    [401, 403],
    async () => {
      await api.functional.todoApp.todoAdmin.systemConfigs.create(
        unauthenticatedConnection,
        {
          body: createBody2,
        },
      );
    },
  );
}
