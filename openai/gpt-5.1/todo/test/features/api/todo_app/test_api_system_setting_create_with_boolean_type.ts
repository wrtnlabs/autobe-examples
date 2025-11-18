import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate creation of a boolean-typed system setting by an admin user.
 *
 * Business goal
 *
 * - Ensure that an authorized admin can create a global configuration entry in
 *   todo_app_system_settings where `type = "boolean"` and `value = "true"`.
 * - Confirm that the backend accepts this combination as semantically compatible
 *   and returns a fully-populated ITodoAppSystemSetting.
 *
 * End-to-end flow
 *
 * 1. Join an admin user via POST /auth/adminUser/join to obtain an
 *    ITodoAppAdminUser.IAuthorized principal and set the Authorization header
 *    on the shared connection.
 * 2. Call POST /todoApp/adminUser/systemSettings with an
 *    ITodoAppSystemSetting.ICreate payload:
 *
 *    - Key: unique business key like "enable_state_filtering_XXXXXXXX"
 *    - Type: "boolean"
 *    - Value: "true" (string representation of boolean)
 *    - Description: human-readable explanation of the flag
 *    - Group: "features"
 *    - Enabled: true
 * 3. Verify that the response is a valid ITodoAppSystemSetting and that core
 *    business fields are persisted as expected:
 *
 *    - Key matches the requested key
 *    - Type is "boolean"
 *    - Value is "true"
 *    - Enabled is true
 *    - Group matches the requested group
 *    - Id, created_at, updated_at are non-empty strings.
 *
 * Note
 *
 * - This test focuses on the successful/positive path. The optional scenario of
 *   sending an incompatible value for the boolean type is intentionally omitted
 *   to avoid relying on un-specified domain validation rules or introducing
 *   type-unsafe request bodies.
 */
export async function test_api_system_setting_create_with_boolean_type(
  connection: api.IConnection,
) {
  // 1. Register an admin user and obtain an authorized principal
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/register",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppAdminUser.IJoin;

  const admin = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ITodoAppAdminUser.IAuthorized>(admin);

  // Basic sanity checks on the authorized admin
  TestValidator.predicate(
    "admin id should be non-empty string",
    typeof admin.id === "string" && admin.id.length > 0,
  );
  TestValidator.predicate(
    "admin email should match join payload",
    admin.email === adminJoinBody.email,
  );

  // 2. Create a boolean-typed system setting
  const settingKeyPrefix = "enable_state_filtering_";
  const settingKey = `${settingKeyPrefix}${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    key: settingKey,
    value: "true",
    type: "boolean",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "features",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const created = await api.functional.todoApp.adminUser.systemSettings.create(
    connection,
    { body: createBody },
  );
  typia.assert<ITodoAppSystemSetting>(created);

  // 3. Business-level assertions on the created setting
  TestValidator.equals(
    "system setting key should match request key",
    created.key,
    createBody.key,
  );
  TestValidator.equals(
    "system setting type should be boolean",
    created.type,
    "boolean",
  );
  TestValidator.equals(
    "system setting value should be 'true'",
    created.value,
    "true",
  );
  TestValidator.equals(
    "system setting enabled should be true",
    created.enabled,
    true,
  );
  TestValidator.equals(
    "system setting group should match request group",
    created.group,
    createBody.group,
  );

  // Description is optional, but when provided we expect it to be echoed back
  TestValidator.predicate(
    "system setting description should not be empty when provided",
    created.description !== null &&
      created.description !== undefined &&
      created.description.length > 0,
  );

  // Sanity checks for identity and lifecycle timestamps
  TestValidator.predicate(
    "system setting id should be non-empty string",
    typeof created.id === "string" && created.id.length > 0,
  );
  TestValidator.predicate(
    "system setting created_at should be non-empty string",
    typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.predicate(
    "system setting updated_at should be non-empty string",
    typeof created.updated_at === "string" && created.updated_at.length > 0,
  );
}
