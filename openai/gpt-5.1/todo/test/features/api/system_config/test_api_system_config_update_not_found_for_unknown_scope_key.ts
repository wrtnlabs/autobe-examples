import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate that updating a non-existent system configuration entry fails.
 *
 * Business goal: Ensure that the admin-only configuration update endpoint does
 * not create new configuration rows when the targeted (scope, key) pair does
 * not exist. An update must be strictly tied to an existing configuration, and
 * attempting to update a missing one should result in an error instead of an
 * implicit upsert.
 *
 * High-level flow:
 *
 * 1. Register a new todoAdmin via /auth/todoAdmin/join to obtain an authenticated
 *    context (SDK will set Authorization header).
 * 2. Pick a clearly non-existent scope and config key (high-entropy random
 *    strings) to minimize any risk of collision with real rows.
 * 3. Build a syntactically valid ITodoAppSystemConfig.IUpdate body.
 * 4. Call PUT /todoApp/todoAdmin/systemConfigs/{scope}/{configKey} with those path
 *    parameters and the update body.
 * 5. Assert that the call fails using TestValidator.error, proving that the
 *    endpoint rejects updates for unknown configuration identifiers.
 */
export async function test_api_system_config_update_not_found_for_unknown_scope_key(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin to obtain an authenticated context.
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todoapp.test/register",
    referrer: "https://admin.todoapp.test/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Choose a scope/configKey pair that should not exist.
  const unknownScope: string = `unknown-scope-${RandomGenerator.alphaNumeric(12)}`;
  const unknownKey: string = `missing_key_${RandomGenerator.alphaNumeric(12)}`;

  // 3. Prepare a syntactically valid update body.
  const updateBody = {
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.IUpdate;

  // 4. Attempt to update the non-existent configuration.
  // 5. Assert that this call fails instead of succeeding.
  await TestValidator.error(
    "updating non-existent system configuration must fail",
    async () => {
      await api.functional.todoApp.todoAdmin.systemConfigs.update(connection, {
        scope: unknownScope,
        configKey: unknownKey,
        body: updateBody,
      });
    },
  );
}
