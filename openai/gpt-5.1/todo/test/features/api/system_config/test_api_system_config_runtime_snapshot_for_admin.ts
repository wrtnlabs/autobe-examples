import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import type { ITodoAppSystemConfigRuntime } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfigRuntime";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate runtime system configuration snapshot for todoAdmin.
 *
 * Business goal: Ensure that when a todoAdmin creates a concrete system
 * configuration entry, the admin-only runtime snapshot endpoint GET
 * /todoApp/todoAdmin/systemConfigs/runtime correctly reflects that active
 * configuration in the appropriate scope.
 *
 * High-level flow:
 *
 * 1. Register a fresh todoAdmin using the public join endpoint.
 * 2. As that authenticated admin, create a deterministic system config row (scope
 *    "todo", key "deletion_model", value "soft").
 * 3. Fetch the runtime snapshot for system configs.
 * 4. Assert that the snapshot structure matches ITodoAppSystemConfigRuntime and
 *    that the created key appears under the "todo" scope with the expected
 *    string value.
 * 5. Lightly verify that other scopes (auth, system) are present as objects,
 *    without enforcing specific keys.
 */
export async function test_api_system_config_runtime_snapshot_for_admin(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin via /auth/todoAdmin/join
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todoapp.test/settings/system-configs",
    referrer: "https://admin.todoapp.test/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create a deterministic system configuration row as this admin
  const configScope = "todo";
  const configKey = "deletion_model";
  const configValue = "soft";

  const createBody = {
    scope: configScope,
    key: configKey,
    value: configValue,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
  } satisfies ITodoAppSystemConfig.ICreate;

  const createdConfig: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppSystemConfig>(createdConfig);

  // Basic sanity checks on created configuration
  TestValidator.equals(
    "created config scope must match input scope",
    createdConfig.scope,
    configScope,
  );
  TestValidator.equals(
    "created config key must match input key",
    createdConfig.key,
    configKey,
  );
  TestValidator.equals(
    "created config value must match input value",
    createdConfig.value,
    configValue,
  );
  TestValidator.predicate(
    "created config must be active",
    createdConfig.is_active === true,
  );

  // 3. Retrieve the runtime snapshot
  const runtimeSnapshot: ITodoAppSystemConfigRuntime =
    await api.functional.todoApp.todoAdmin.systemConfigs.runtime.at(connection);
  typia.assert<ITodoAppSystemConfigRuntime>(runtimeSnapshot);

  // 4. Assert that the todo scope contains our key with the expected value
  TestValidator.predicate(
    "todo scope must contain deletion_model key",
    Object.prototype.hasOwnProperty.call(runtimeSnapshot.todo, configKey),
  );
  TestValidator.equals(
    "runtime todo.deletion_model value must equal created config value",
    runtimeSnapshot.todo[configKey],
    configValue,
  );

  // 5. Verify that auth and system scopes are present as objects (may be empty)
  TestValidator.predicate(
    "auth scope object must be defined",
    typeof runtimeSnapshot.auth === "object" && runtimeSnapshot.auth !== null,
  );
  TestValidator.predicate(
    "system scope object must be defined",
    typeof runtimeSnapshot.system === "object" &&
      runtimeSnapshot.system !== null,
  );
}
