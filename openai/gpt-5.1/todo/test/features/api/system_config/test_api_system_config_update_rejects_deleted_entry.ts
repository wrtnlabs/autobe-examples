import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate that updating a soft-deleted system configuration entry is rejected.
 *
 * Business rule: configuration entries in todo_app_system_configs are only
 * updatable when their deleted_at column is null. Once an admin performs a
 * logical delete via DELETE
 * /todoApp/todoAdmin/systemConfigs/{scope}/{configKey}, the row is considered
 * removed from the active configuration surface and must no longer be
 * modifiable through the normal update endpoint. Any attempt to PUT the same
 * (scope, key) should behave as a not-found style error rather than
 * resurrecting or mutating the logically deleted row.
 *
 * High-level flow:
 *
 * 1. Register a todoAdmin via /auth/todoAdmin/join to obtain an authenticated
 *    administrative context. The join call also wires the Authorization header
 *    on the shared connection through the SDK, so subsequent privileged calls
 *    run as this admin.
 * 2. As this admin, create a configuration row using POST
 *    /todoApp/todoAdmin/systemConfigs with a deterministic scope/key pair and
 *    some simple value/description so that we can later target it.
 * 3. Soft-delete that configuration via DELETE
 *    /todoApp/todoAdmin/systemConfigs/{scope}/{configKey}. This should mark
 *    deleted_at with the current timestamp and flip is_active to false in the
 *    stored row.
 * 4. Attempt to update the same logical configuration with PUT
 *    /todoApp/todoAdmin/systemConfigs/{scope}/{configKey}, sending an
 *    ITodoAppSystemConfig.IUpdate payload that changes the value and/or
 *    description fields.
 * 5. Assert that this update attempt fails with an HTTP error due to the
 *    underlying implementation filtering by deleted_at === null. In concrete
 *    business terms, the update endpoint must not allow reactivation or
 *    modification of a logically deleted configuration entry.
 *
 * Type constraints and DTO usage:
 *
 * - Use ITodoAppTodoAdminJoin.IRequest as the request body for the join call.
 * - Use ITodoAppTodoAdmin.IAuthorized as the response type for the join call.
 * - Use ITodoAppSystemConfig.ICreate for the POST body and ITodoAppSystemConfig
 *   for the create and erase responses.
 * - Use ITodoAppSystemConfig.IUpdate for the PUT body, ensuring that all fields
 *   are optional and we only populate the ones we care about.
 *
 * Assertions and validation:
 *
 * - Use typia.assert() on all successful responses (join, create, erase) to
 *   guarantee they match the expected DTO shapes.
 * - Use TestValidator.error() around the update attempt to assert that an error
 *   is thrown when trying to modify a soft-deleted configuration.
 * - Do NOT validate specific HTTP status codes to comply with the prohibition on
 *   status-code-specific assertions; the key contract is that the call fails,
 *   not the exact numeric code.
 */
export async function test_api_system_config_update_rejects_deleted_entry(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin and obtain authorized context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a configuration entry with a specific scope/key.
  const scope = "todo";
  const configKey = `deletion_model_${RandomGenerator.alphabets(8)}`;

  const createBody = {
    scope,
    key: configKey,
    value: "soft_delete",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const created: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  TestValidator.equals("created config scope matches", created.scope, scope);
  TestValidator.equals("created config key matches", created.key, configKey);

  // 3. Soft-delete the configuration via DELETE.
  const erased: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.erase(connection, {
      scope,
      configKey,
    });
  typia.assert(erased);

  TestValidator.equals("erased config scope matches", erased.scope, scope);
  TestValidator.equals("erased config key matches", erased.key, configKey);

  // 4. Attempt to update the logically deleted configuration.
  const updateBody = {
    value: "hard_delete",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.IUpdate;

  await TestValidator.error(
    "updating a soft-deleted system config must fail",
    async () => {
      await api.functional.todoApp.todoAdmin.systemConfigs.update(connection, {
        scope,
        configKey,
        body: updateBody,
      });
    },
  );
}
