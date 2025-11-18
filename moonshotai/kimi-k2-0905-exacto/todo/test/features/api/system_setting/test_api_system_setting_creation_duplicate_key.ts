import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemSetting";

/**
 * Validate duplicate key protection on system setting creation.
 *
 * This test authenticates as a new administrator, creates an initial system
 * setting with a unique key, and attempts to create another setting with the
 * same key. The API should reject the second creation with a duplication error,
 * confirming the unique constraint on system setting keys is enforced and only
 * one entry is created.
 *
 * 1. Register and authenticate new admin
 * 2. Create a system setting with a unique key
 * 3. Attempt to create a duplicate system setting with the same key
 * 4. Assert that the first creation succeeds and the second operation fails with a
 *    duplication error
 */
export async function test_api_system_setting_creation_duplicate_key(
  connection: api.IConnection,
) {
  // 1. Register and authenticate new admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: "https://admin.todo-list.test/join", // realistic test context
    referrer: "https://admin.todo-list.test/",
  } satisfies ITodoListAdmin.IJoin;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(admin);

  // 2. Create a system setting with a unique key
  const uniqueSettingKey: string & tags.MaxLength<100> =
    "autobe_setting_" + RandomGenerator.alphaNumeric(16);
  const settingInput = {
    key: uniqueSettingKey,
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoListSystemSetting.ICreate;
  const setting: ITodoListSystemSetting =
    await api.functional.todoList.admin.systemSettings.create(connection, {
      body: settingInput,
    });
  typia.assert(setting);
  TestValidator.equals(
    "created system setting key matches input",
    setting.key,
    uniqueSettingKey,
  );
  TestValidator.equals(
    "created setting value matches input",
    setting.value,
    settingInput.value,
  );
  TestValidator.equals(
    "created setting description matches input",
    setting.description,
    settingInput.description,
  );

  // 3. Attempt to create a duplicate system setting with the same key
  const duplicateSettingInput = {
    key: uniqueSettingKey,
    value: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITodoListSystemSetting.ICreate;
  await TestValidator.error(
    "duplicate system setting key is rejected",
    async () => {
      await api.functional.todoList.admin.systemSettings.create(connection, {
        body: duplicateSettingInput,
      });
    },
  );
}
