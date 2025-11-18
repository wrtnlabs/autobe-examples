import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Verify that updating a system setting strictly requires admin authentication.
 *
 * Business context:
 *
 * - System settings in todoApp (todo_app_system_settings) control global behavior
 *   of the service (limits, feature flags, etc.).
 * - Only administrative actors (adminUser) are allowed to create and update these
 *   settings.
 * - Any unauthenticated or improperly authenticated request attempting to update
 *   a system setting must be rejected.
 *
 * Test steps:
 *
 * 1. Register an admin user via POST /auth/adminUser/join.
 *
 *    - This seeds an administrative principal and, via the SDK, attaches an
 *         Authorization header to the provided connection for subsequent
 *         calls.
 * 2. Create an initial system setting via POST /todoApp/adminUser/systemSettings
 *    using the authenticated connection.
 * 3. Construct an unauthenticated connection by shallow-cloning the original
 *    connection but providing an empty headers object, without touching the
 *    original connection.headers after that.
 * 4. Attempt to update the system setting using PUT
 *    /todoApp/adminUser/systemSettings/{settingKey} with the unauthenticated
 *    connection and expect an error via TestValidator.error.
 * 5. Perform a valid authenticated update using the original authenticated
 *    connection and assert that the update succeeds and that returned fields
 *    reflect the requested changes.
 *
 * This demonstrates that admin authentication is both required and sufficient
 * for updating system settings.
 */
export async function test_api_system_setting_update_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register an admin user and obtain an authenticated connection
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.example.com/register",
    referrer: "https://admin.todo-app.example.com/",
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial system setting using authenticated connection
  const settingKey: string = `max_active_todos_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    key: settingKey,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const created: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  TestValidator.equals(
    "created system setting key must match input key",
    created.key,
    settingKey,
  );

  // 3. Prepare an unauthenticated connection (no Authorization header)
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to update the setting without authentication and expect failure
  const unauthUpdateBody = {
    value: "200",
    enabled: false,
  } satisfies ITodoAppSystemSetting.IUpdate;

  await TestValidator.error(
    "unauthenticated system setting update must fail",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.update(
        unauthenticated,
        {
          settingKey: created.key,
          body: unauthUpdateBody,
        },
      );
    },
  );

  // 5. Perform a valid authenticated update and verify success
  const authUpdateBody = {
    value: "150",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.IUpdate;

  const updated: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.update(connection, {
      settingKey: created.key,
      body: authUpdateBody,
    });
  typia.assert(updated);

  // Key must remain the same
  TestValidator.equals(
    "updated system setting key must remain unchanged",
    updated.key,
    created.key,
  );

  // Updated business fields must match the authenticated update body
  TestValidator.equals(
    "updated system setting value must match authenticated update",
    updated.value,
    authUpdateBody.value,
  );

  TestValidator.equals(
    "updated system setting type must match authenticated update",
    updated.type,
    authUpdateBody.type,
  );

  TestValidator.equals(
    "updated system setting description must match authenticated update",
    updated.description,
    authUpdateBody.description,
  );

  TestValidator.equals(
    "updated system setting group must match authenticated update",
    updated.group,
    authUpdateBody.group,
  );

  TestValidator.equals(
    "updated system setting enabled flag must match authenticated update",
    updated.enabled,
    authUpdateBody.enabled,
  );
}
