import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Ensure admin cannot load details for non-existent or logically deleted system
 * settings.
 *
 * Business context: Admin users manage global configuration entries via
 * todo_app_system_settings. The detail endpoint GET
 * /todoApp/adminUser/systemSettings/{settingKey} must only expose active
 * (non-deleted) settings. When a key does not exist at all, or has been
 * soft-deleted via DELETE, the API should behave as not-found instead of
 * returning the underlying record.
 *
 * Scenario steps:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join; this returns
 *    ITodoAppAdminUser.IAuthorized and sets Authorization on the connection.
 * 2. Probe detail with a random, surely-unknown key using GET
 *    /todoApp/adminUser/systemSettings/{settingKey}. Expect a not-found style
 *    error, asserted via TestValidator.error (no status-code checking).
 * 3. Create a real setting with POST /todoApp/adminUser/systemSettings using
 *    ITodoAppSystemSetting.ICreate, with a distinct random key and realistic
 *    value/type/description/group/enabled fields. Assert the created
 *    ITodoAppSystemSetting with typia.assert.
 * 4. Logically delete that setting using DELETE
 *    /todoApp/adminUser/systemSettings/{settingKey} for the created key. This
 *    should succeed without returning a body.
 * 5. Call the detail endpoint again for the deleted key and assert that it now
 *    behaves as not-found via TestValidator.error, confirming that soft-deleted
 *    configuration entries are hidden from the detail endpoint.
 */
export async function test_api_system_settings_detail_not_found_for_unknown_key(
  connection: api.IConnection,
) {
  // 1. Register an admin user and establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/register",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Request detail for a clearly non-existent setting key
  const unknownKey: string = `unknown_setting_${RandomGenerator.alphaNumeric(16)}`;

  await TestValidator.error(
    "detail request for unknown system setting key should fail",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.at(connection, {
        settingKey: unknownKey,
      });
    },
  );

  // 3. Create a real system setting with a known key
  const existingKey: string = `existing_setting_${RandomGenerator.alphaNumeric(16)}`;

  const createBody = {
    key: existingKey,
    value: "1000",
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
    "created system setting key should match request body",
    created.key,
    existingKey,
  );

  // 4. Logically delete the created setting by its key
  await api.functional.todoApp.adminUser.systemSettings.erase(connection, {
    settingKey: existingKey,
  });

  // 5. Verify that detail endpoint now treats the deleted key as not found
  await TestValidator.error(
    "detail request for logically deleted system setting should fail",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.at(connection, {
        settingKey: existingKey,
      });
    },
  );
}
