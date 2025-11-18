import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import type { ITodoListSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemSetting";

/**
 * Validate that an admin can update a system setting and that all compliance
 * and business rules are enforced.
 *
 * 1. Register a new admin (to gain token for privileged settings operations)
 * 2. Create a unique setting key and an initial value+description, then perform an
 *    update with them
 * 3. Update again with a new value and a new description
 * 4. Remove the description by updating with description: null (should set
 *    description to null or undefined)
 * 5. For all updates, assert response is valid, version increments by 1,
 *    "updated_at" timestamp advances, and new data is persisted
 * 6. Validate that "value" is within 1-2048 chars, "description" is either 1-1000
 *    chars or null/undefined
 * 7. Test error: value outside allowed limits (too short/long); description too
 *    long; description as empty string (not allowed)
 * 8. For error cases, confirm that update fails and returns error.
 */
export async function test_api_system_settings_update_by_admin(
  connection: api.IConnection,
) {
  // Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(2),
        href: "https://admin.test/registration",
        referrer: "https://admin.test/landing",
        ip: undefined,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Prepare system setting key and value for test
  const settingKey = `feature_${RandomGenerator.alphaNumeric(8)}`;
  let version: number | undefined = undefined;
  let updatedAt: string | undefined = undefined;

  // Initial update (required value, with description)
  const initialValue = RandomGenerator.paragraph({ sentences: 10 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });
  let setting = await api.functional.todoList.admin.systemSettings.update(
    connection,
    {
      key: settingKey,
      body: {
        value: initialValue,
        description: initialDescription,
      } satisfies ITodoListSystemSetting.IUpdate,
    },
  );
  typia.assert(setting);
  TestValidator.equals("setting key is correct", setting.key, settingKey);
  TestValidator.equals("setting value persisted", setting.value, initialValue);
  TestValidator.equals(
    "setting description persisted",
    setting.description,
    initialDescription,
  );
  version = setting.version;
  updatedAt = setting.updated_at;

  // Second update (change value & description)
  const updatedValue = RandomGenerator.paragraph({ sentences: 30 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 8 });
  const setting2 = await api.functional.todoList.admin.systemSettings.update(
    connection,
    {
      key: settingKey,
      body: {
        value: updatedValue,
        description: updatedDescription,
      } satisfies ITodoListSystemSetting.IUpdate,
    },
  );
  typia.assert(setting2);
  TestValidator.equals(
    "version incremented on update",
    setting2.version,
    version + 1,
  );
  TestValidator.notEquals(
    "updated_at timestamp advanced",
    setting2.updated_at,
    updatedAt,
  );
  TestValidator.equals("value updated", setting2.value, updatedValue);
  TestValidator.equals(
    "description updated",
    setting2.description,
    updatedDescription,
  );
  version = setting2.version;
  updatedAt = setting2.updated_at;
  TestValidator.predicate(
    "value within allowed length after update",
    setting2.value.length >= 1 && setting2.value.length <= 2048,
  );
  TestValidator.predicate(
    "description within allowed length after update",
    setting2.description !== null &&
      setting2.description !== undefined &&
      setting2.description.length >= 1 &&
      setting2.description.length <= 1000,
  );

  // Third update: remove description (set to null)
  const valueAfterRemoval = RandomGenerator.paragraph({ sentences: 4 });
  const setting3 = await api.functional.todoList.admin.systemSettings.update(
    connection,
    {
      key: settingKey,
      body: {
        value: valueAfterRemoval,
        description: null,
      } satisfies ITodoListSystemSetting.IUpdate,
    },
  );
  typia.assert(setting3);
  TestValidator.equals(
    "version incremented after removing description",
    setting3.version,
    version + 1,
  );
  TestValidator.equals(
    "description removed (null)",
    setting3.description,
    null,
  );
  TestValidator.equals(
    "value updated after removing description",
    setting3.value,
    valueAfterRemoval,
  );

  // Field constraint: Value too short (empty string)
  await TestValidator.error(
    "value with 0 chars (empty string) should fail",
    async () => {
      await api.functional.todoList.admin.systemSettings.update(connection, {
        key: settingKey,
        body: {
          value: "",
          description: "valid",
        } satisfies ITodoListSystemSetting.IUpdate,
      });
    },
  );

  // Field constraint: Value too long (over 2048 chars)
  await TestValidator.error("value over 2048 chars should fail", async () => {
    await api.functional.todoList.admin.systemSettings.update(connection, {
      key: settingKey,
      body: {
        value: "x".repeat(2049),
        description: "valid",
      } satisfies ITodoListSystemSetting.IUpdate,
    });
  });

  // Field constraint: Description too long (over 1000 chars)
  await TestValidator.error(
    "description over 1000 chars should fail",
    async () => {
      await api.functional.todoList.admin.systemSettings.update(connection, {
        key: settingKey,
        body: {
          value: "normal value",
          description: "y".repeat(1001),
        } satisfies ITodoListSystemSetting.IUpdate,
      });
    },
  );

  // Field constraint: Description as empty string (should fail)
  await TestValidator.error(
    "description as empty string should fail",
    async () => {
      await api.functional.todoList.admin.systemSettings.update(connection, {
        key: settingKey,
        body: {
          value: "another normal value",
          description: "",
        } satisfies ITodoListSystemSetting.IUpdate,
      });
    },
  );
}
