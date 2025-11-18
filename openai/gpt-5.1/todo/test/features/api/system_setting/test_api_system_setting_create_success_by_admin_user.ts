import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_setting_create_success_by_admin_user(
  connection: api.IConnection,
) {
  /**
   * Validate that an authenticated admin user can create a new global system
   * setting entry via the protected /todoApp/adminUser/systemSettings
   * endpoint.
   *
   * Business flow:
   *
   * 1. Register a fresh admin user using /auth/adminUser/join. This both creates
   *    the admin account and configures the connection with a valid
   *    Authorization header (access token) for the adminUser actor.
   * 2. Using the authenticated admin connection, call
   *    /todoApp/adminUser/systemSettings with a meaningful
   *    ITodoAppSystemSetting.ICreate payload for something like
   *    "max_active_todos_per_user".
   * 3. Assert that the response conforms to ITodoAppSystemSetting and that
   *    business fields (key, value, type, description, group, enabled) match
   *    the request while server-managed fields (id, timestamps, deleted_at) are
   *    populated correctly for a new, non-deleted setting.
   */

  // 1. Join as a new admin user to obtain authorized context (token is
  // automatically attached to connection.headers by the SDK join() call).
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd-1234",
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/register",
    referrer: "https://admin.todoapp.local/login",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);

  // 2. Prepare a concrete system setting creation payload.
  const settingKey = "max_active_todos_per_user";
  const settingValue = "100"; // Representing an integer limit, encoded as string
  const settingType = "int"; // Semantic type descriptor for the value
  const settingDescription =
    "Maximum number of active (non-completed) todo items allowed per member user.";
  const settingGroup = "limits";

  const createBody = {
    key: settingKey,
    value: settingValue,
    type: settingType,
    description: settingDescription,
    group: settingGroup,
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const created: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppSystemSetting>(created);

  // 3. Business-level assertions comparing request vs response.
  TestValidator.equals(
    "system setting key should match the requested key",
    created.key,
    settingKey,
  );

  TestValidator.equals(
    "system setting value should match the requested value",
    created.value,
    settingValue,
  );

  TestValidator.equals(
    "system setting type should match the requested type",
    created.type,
    settingType,
  );

  TestValidator.equals(
    "system setting description should match the requested description",
    created.description,
    settingDescription,
  );

  TestValidator.equals(
    "system setting group should match the requested group",
    created.group,
    settingGroup,
  );

  TestValidator.equals(
    "system setting enabled flag should match the requested enabled state",
    created.enabled,
    true,
  );

  // Ensure id and timestamps are non-empty strings in the expected formats.
  TestValidator.predicate(
    "system setting id should be a non-empty UUID-like string",
    () => typeof created.id === "string" && created.id.length > 0,
  );

  TestValidator.predicate(
    "system setting created_at should be a non-empty date-time string",
    () =>
      typeof created.created_at === "string" && created.created_at.length > 0,
  );

  TestValidator.predicate(
    "system setting updated_at should be a non-empty date-time string",
    () =>
      typeof created.updated_at === "string" && created.updated_at.length > 0,
  );

  // For a newly created setting, deleted_at should be null or undefined.
  TestValidator.predicate(
    "system setting deleted_at should be null or undefined on creation",
    () => created.deleted_at === null || created.deleted_at === undefined,
  );
}
