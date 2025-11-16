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
 * Ensure runtime system configuration snapshot reflects latest active values.
 *
 * Business goal: Validate that the admin-facing runtime configuration endpoint
 * `/todoApp/todoAdmin/systemConfigs/runtime` returns an aggregated
 * ITodoAppSystemConfigRuntime object whose scoped key/value pairs match the
 * most recent _active_ rows in `todo_app_system_configs`, per (scope, key).
 *
 * Scenario:
 *
 * 1. Register a fresh todoAdmin via `/auth/todoAdmin/join` using
 *    ITodoAppTodoAdminJoin.IRequest. Rely on the SDK to automatically store the
 *    access token into `connection.headers.Authorization` for authenticated
 *    calls.
 * 2. As this admin, create three baseline configuration rows using
 *    `/todoApp/todoAdmin/systemConfigs`
 *    (api.functional.todoApp.todoAdmin.systemConfigs.create):
 *
 *    - Scope="todo", key="deletion_model", value="soft" (implicit is_active=true)
 *    - Scope="auth", key="session_timeout_minutes", value="30" (implicit
 *         is_active=true)
 *    - Scope="system", key="maintenance_mode", value="off" (implicit is_active=true)
 * 3. Create an additional configuration entry for the same logical key
 *    "system"/"maintenance_mode" but with a different value (e.g., "on") and
 *    explicitly set `is_active: true` to emulate an updated active row.
 * 4. Call `/todoApp/todoAdmin/systemConfigs/runtime` via
 *    api.functional.todoApp.todoAdmin.systemConfigs.runtime.at.
 * 5. Validate that:
 *
 *    - The response conforms to ITodoAppSystemConfigRuntime using typia.assert.
 *    - `runtime.todo.deletion_model === "soft"`.
 *    - `runtime.auth.session_timeout_minutes === "30"`.
 *    - `runtime.system.maintenance_mode` equals the value from the most recently
 *         created active configuration row (e.g., "on").
 *
 * Notes:
 *
 * - We cannot directly manipulate deleted_at or inactive rows with the provided
 *   DTOs, so the test focuses on the "latest active wins" behavior by creating
 *   only active rows and expecting the runtime snapshot to pick the last one
 *   for a given (scope, key).
 */
export async function test_api_system_config_runtime_reflects_latest_values(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin account and obtain authorized context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  // Validate authorized admin structure
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);
  // Also validate embedded token type
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create baseline configuration rows for todo, auth, and system scopes.
  const todoConfig: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: {
        scope: "todo",
        key: "deletion_model",
        value: "soft",
        description: "Todo deletion behavior model",
        // omit is_active to allow server default (expected true)
      } satisfies ITodoAppSystemConfig.ICreate,
    });
  typia.assert<ITodoAppSystemConfig>(todoConfig);

  const authConfig: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: {
        scope: "auth",
        key: "session_timeout_minutes",
        value: "30",
        description: "Session timeout in minutes for todoAdmin UI",
      } satisfies ITodoAppSystemConfig.ICreate,
    });
  typia.assert<ITodoAppSystemConfig>(authConfig);

  const initialSystemConfig: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: {
        scope: "system",
        key: "maintenance_mode",
        value: "off",
        description: "Initial maintenance mode flag",
      } satisfies ITodoAppSystemConfig.ICreate,
    });
  typia.assert<ITodoAppSystemConfig>(initialSystemConfig);

  // 3. Create an additional active configuration row for the same
  //    (scope, key) pair system/maintenance_mode to emulate an updated value.
  const latestMaintenanceValue = "on";
  const updatedSystemConfig: ITodoAppSystemConfig =
    await api.functional.todoApp.todoAdmin.systemConfigs.create(connection, {
      body: {
        scope: "system",
        key: "maintenance_mode",
        value: latestMaintenanceValue,
        description: "Updated maintenance mode flag",
        is_active: true,
      } satisfies ITodoAppSystemConfig.ICreate,
    });
  typia.assert<ITodoAppSystemConfig>(updatedSystemConfig);

  // 4. Fetch the runtime configuration snapshot for the authenticated admin.
  const runtime: ITodoAppSystemConfigRuntime =
    await api.functional.todoApp.todoAdmin.systemConfigs.runtime.at(connection);
  typia.assert<ITodoAppSystemConfigRuntime>(runtime);

  // 5. Validate that runtime snapshot reflects latest active values.
  TestValidator.equals(
    "todo.deletion_model matches created config value",
    runtime.todo.deletion_model,
    "soft",
  );

  TestValidator.equals(
    "auth.session_timeout_minutes matches created config value",
    runtime.auth.session_timeout_minutes,
    "30",
  );

  TestValidator.equals(
    "system.maintenance_mode uses the latest active config value",
    runtime.system.maintenance_mode,
    latestMaintenanceValue,
  );
}
