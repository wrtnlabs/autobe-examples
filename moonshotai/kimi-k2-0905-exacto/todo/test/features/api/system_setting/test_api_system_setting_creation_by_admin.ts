import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemSetting";

/**
 * Validate system setting creation by an authenticated admin.
 *
 * This test confirms that:
 *
 * 1. An admin can register and obtain authentication.
 * 2. Once authenticated, the admin can create a unique system setting by
 *    specifying a key and value.
 * 3. The API returns a system setting object with the correct fields: key, value,
 *    (optional) description, id, timestamps.
 * 4. Optional field (description) is handled correctly—can be provided or omitted.
 *
 * Scenario Steps:
 *
 * 1. Register a new admin using valid random registration data.
 * 2. Use admin authentication context to create a new system setting, providing
 *    key, value, and description.
 * 3. Validate the API response has the correct structure and values.
 * 4. Create a system setting without a description and verify the response.
 */
export async function test_api_system_setting_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin-portal.example.com/registration",
    referrer: "https://admin-portal.example.com/",
    ip: null,
  } satisfies ITodoListAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create a new system setting (with description)
  const settingKey = `feature_flag_${RandomGenerator.alphaNumeric(8)}`;
  const settingValue = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });
  const settingDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 10,
  });
  const systemSettingBody = {
    key: settingKey,
    value: settingValue,
    description: settingDescription,
  } satisfies ITodoListSystemSetting.ICreate;
  const setting = await api.functional.todoList.admin.systemSettings.create(
    connection,
    { body: systemSettingBody },
  );
  typia.assert(setting);
  TestValidator.equals(
    "system setting key matches input",
    setting.key,
    settingKey,
  );
  TestValidator.equals(
    "system setting value matches input",
    setting.value,
    settingValue,
  );
  TestValidator.equals(
    "system setting description matches input",
    setting.description,
    settingDescription,
  );
  TestValidator.predicate(
    "system setting id is valid uuid",
    typeof setting.id === "string" && setting.id.length > 0,
  );
  TestValidator.predicate(
    "system setting has valid created_at timestamp",
    typeof setting.created_at === "string" && setting.created_at.length > 0,
  );
  TestValidator.predicate(
    "system setting has valid updated_at timestamp",
    typeof setting.updated_at === "string" && setting.updated_at.length > 0,
  );

  // 3. Create system setting without description
  const systemSettingWithoutDescBody = {
    key: `${settingKey}_nodecr`,
    value: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
  } satisfies ITodoListSystemSetting.ICreate;
  const settingNoDesc =
    await api.functional.todoList.admin.systemSettings.create(connection, {
      body: systemSettingWithoutDescBody,
    });
  typia.assert(settingNoDesc);
  TestValidator.equals(
    "created setting without description matches input",
    settingNoDesc.key,
    systemSettingWithoutDescBody.key,
  );
  TestValidator.equals(
    "created setting without description matches input value",
    settingNoDesc.value,
    systemSettingWithoutDescBody.value,
  );
  TestValidator.equals(
    "setting description missing or null when not provided",
    settingNoDesc.description,
    null,
  );
}
