import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate updating an existing todoApp system setting using a re-authenticated
 * admin login session.
 *
 * This test ensures that an administrative user who first joined and created a
 * system setting, and then logs in again in a new logical session, can still
 * fully manage configuration entries via the login-issued token.
 *
 * High-level steps:
 *
 * 1. Admin joins (POST /auth/adminUser/join) with random but valid credentials.
 * 2. While authenticated from join, admin creates a system setting via POST
 *    /todoApp/adminUser/systemSettings using a deterministic key.
 * 3. Admin logs in again using POST /auth/adminUser/login with the same
 *    credentials, receiving a fresh ITodoAppAdminUser.IAuthorized and new
 *    Authorization header set by the SDK.
 * 4. Using the login-based session, admin updates the previously created setting
 *    via PUT /todoApp/adminUser/systemSettings/{settingKey}, changing at least
 *    value and enabled (and optionally description/group).
 * 5. Validate that id and key are unchanged, while mutable fields and updated_at
 *    have changed as expected.
 */
export async function test_api_system_setting_update_via_admin_login_existing_account(
  connection: api.IConnection,
) {
  // 1. Admin joins with valid credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies ITodoAppAdminUser.IJoin;

  const joinedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Create a system setting under the join-based session
  const settingKey: string = `e2e_setting_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    key: settingKey,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert(createdSetting);

  // Sanity checks on created entity
  TestValidator.equals(
    "created setting key must match requested key",
    createdSetting.key,
    settingKey,
  );
  TestValidator.equals(
    "created setting enabled flag should match",
    createdSetting.enabled,
    createBody.enabled,
  );

  // Capture original snapshot for later comparison
  const originalId: string & tags.Format<"uuid"> = createdSetting.id;
  const originalKey: string = createdSetting.key;
  const originalValue: string = createdSetting.value;
  const originalDescription: string | null | undefined =
    createdSetting.description;
  const originalGroup: string | null | undefined = createdSetting.group;
  const originalEnabled: boolean = createdSetting.enabled;
  const originalUpdatedAt: string & tags.Format<"date-time"> =
    createdSetting.updated_at;

  // 3. Log in again with the same credentials (new logical session)
  const loginBody = {
    email,
    password,
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies ITodoAppAdminUser.ILogin;

  const loggedInAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  TestValidator.equals(
    "logged-in admin id matches joined admin id",
    loggedInAdmin.id,
    joinedAdmin.id,
  );

  // 4. Update the system setting using login-issued token
  const updatedValue: string = "200";
  const updatedDescription: string = RandomGenerator.paragraph({
    sentences: 4,
  });
  const updatedGroup: string = "limits_updated";
  const updatedEnabled: boolean = false;

  const updateBody = {
    value: updatedValue,
    type: "int",
    description: updatedDescription,
    group: updatedGroup,
    enabled: updatedEnabled,
  } satisfies ITodoAppSystemSetting.IUpdate;

  const updatedSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.update(connection, {
      settingKey,
      body: updateBody,
    });
  typia.assert(updatedSetting);

  // 5. Validate invariants and changes
  TestValidator.equals(
    "updated setting id must remain the same",
    updatedSetting.id,
    originalId,
  );
  TestValidator.equals(
    "updated setting key must remain the same",
    updatedSetting.key,
    originalKey,
  );

  TestValidator.equals(
    "updated setting value should match new value",
    updatedSetting.value,
    updatedValue,
  );
  TestValidator.equals(
    "updated setting enabled flag should match new value",
    updatedSetting.enabled,
    updatedEnabled,
  );
  TestValidator.equals(
    "updated setting description should match new description",
    updatedSetting.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated setting group should match new group",
    updatedSetting.group,
    updatedGroup,
  );

  TestValidator.notEquals(
    "updated_at should be refreshed after update",
    updatedSetting.updated_at,
    originalUpdatedAt,
  );

  TestValidator.notEquals(
    "value should actually change from original",
    updatedSetting.value,
    originalValue,
  );
  TestValidator.notEquals(
    "enabled flag should actually change from original",
    updatedSetting.enabled,
    originalEnabled,
  );

  // Optional: ensure description/group changed when they originally existed
  if (originalDescription !== null && originalDescription !== undefined) {
    TestValidator.notEquals(
      "description should differ from original when original existed",
      updatedSetting.description,
      originalDescription,
    );
  }
  if (originalGroup !== null && originalGroup !== undefined) {
    TestValidator.notEquals(
      "group should differ from original when original existed",
      updatedSetting.group,
      originalGroup,
    );
  }
}
