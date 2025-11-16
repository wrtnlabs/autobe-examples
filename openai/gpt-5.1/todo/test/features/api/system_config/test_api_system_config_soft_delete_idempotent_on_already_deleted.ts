import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate idempotent soft-delete semantics for todoApp systemConfigs.
 *
 * Business goal: Ensure that the DELETE
 * /todoApp/todoAdmin/systemConfigs/{scope}/{configKey} endpoint only operates
 * on active (non-deleted) configuration rows and returns a not-found style
 * error when the same configuration is deleted a second time. This confirms
 * that administrators cannot repeatedly delete the same logical row and that
 * soft-delete behavior is stable.
 *
 * Test workflow:
 *
 * 1. Register a todoAdmin using /auth/todoAdmin/join to obtain an authenticated
 *    administrative context.
 * 2. Create a new system configuration entry with a unique (scope, key)
 *    combination via /todoApp/todoAdmin/systemConfigs (create).
 * 3. Soft-delete that configuration once via erase(), expecting success and a
 *    valid ITodoAppSystemConfig response.
 * 4. Invoke erase() again for the same (scope, key), expecting an HTTP 404 or
 *    equivalent not-found error.
 *
 * Validation strategy:
 *
 * - Use typia.assert() on the successful responses to ensure structural type
 *   correctness.
 * - Use TestValidator.httpError() to assert that the second DELETE attempt fails
 *   with a 404 status.
 */
export async function test_api_system_config_soft_delete_idempotent_on_already_deleted(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin (admin context for subsequent calls)
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/signup",
    referrer: "https://todoapp.local/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(admin);

  // 2. Create a new configuration with a unique (scope, key)
  const scope = "todo";
  const key = `deletion_model_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    scope,
    key,
    value: "soft-delete",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const createdConfig: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: createBody,
    });
  typia.assert(createdConfig);

  TestValidator.equals(
    "created config uses requested scope",
    createdConfig.scope,
    scope,
  );
  TestValidator.equals(
    "created config uses requested key",
    createdConfig.key,
    key,
  );

  // 3. First soft-delete should succeed
  const firstDelete: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.erase(connection, {
      scope,
      configKey: key,
    });
  typia.assert(firstDelete);

  TestValidator.equals(
    "first delete response matches config id",
    firstDelete.id,
    createdConfig.id,
  );

  // 4. Second soft-delete must result in 404 not-found style error
  await TestValidator.httpError(
    "second soft-delete on already deleted config should be not-found",
    404,
    async () => {
      await api.functional.todoApp.todoAdmin.systemConfigs.erase(connection, {
        scope,
        configKey: key,
      });
    },
  );
}
