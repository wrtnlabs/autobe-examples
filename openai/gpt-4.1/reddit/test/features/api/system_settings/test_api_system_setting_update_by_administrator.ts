import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSettings";

/**
 * Test that an administrator can update the value and description of a global
 * system setting.
 *
 * 1. Register a new administrator (join), and authenticate.
 * 2. Create a system setting with a unique key, value, and description.
 * 3. Update the system setting: change value and description, verify updated
 *    fields.
 * 4. Update the system setting: change only value, set description=null, verify
 *    only those fields update.
 * 5. Confirm audit fields (key remains identical, created_at does not change,
 *    updated_at does update, deleted_at stays null or unchanged).
 * 6. Attempt update for a non-existent key, expect failure.
 * 7. Ensure strict admin-only access for the entire flow.
 */
export async function test_api_system_setting_update_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Register a new administrator and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      business_status: null,
    },
  });
  typia.assert(admin);

  // Step 2: Create an initial system setting
  const settingKey = `setting_${RandomGenerator.alphaNumeric(8)}`;
  const initialValue = RandomGenerator.alphaNumeric(12);
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const originalSetting =
    await api.functional.communityPlatform.administrator.systemSettings.create(
      connection,
      {
        body: {
          key: settingKey,
          value: initialValue,
          description: initialDescription,
        },
      },
    );
  typia.assert(originalSetting);

  // Step 3: Update the setting value and description
  const updatedValue = RandomGenerator.alphaNumeric(16);
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedSetting =
    await api.functional.communityPlatform.administrator.systemSettings.update(
      connection,
      {
        key: settingKey,
        body: {
          value: updatedValue,
          description: updatedDescription,
        },
      },
    );
  typia.assert(updatedSetting);
  TestValidator.equals(
    "setting key unchanged after update",
    updatedSetting.key,
    settingKey,
  );
  TestValidator.equals("value updated", updatedSetting.value, updatedValue);
  TestValidator.equals(
    "description updated",
    updatedSetting.description,
    updatedDescription,
  );
  TestValidator.equals(
    "created_at unchanged after update",
    updatedSetting.created_at,
    originalSetting.created_at,
  );
  TestValidator.notEquals(
    "updated_at updated after update",
    updatedSetting.updated_at,
    originalSetting.updated_at,
  );
  TestValidator.equals(
    "deleted_at unchanged after update",
    updatedSetting.deleted_at,
    originalSetting.deleted_at,
  );

  // Step 4: Update only value, clear description
  const secondValue = RandomGenerator.alphaNumeric(10);
  const clearedSetting =
    await api.functional.communityPlatform.administrator.systemSettings.update(
      connection,
      {
        key: settingKey,
        body: {
          value: secondValue,
          description: null,
        },
      },
    );
  typia.assert(clearedSetting);
  TestValidator.equals(
    "setting key unchanged on description clear",
    clearedSetting.key,
    settingKey,
  );
  TestValidator.equals(
    "value updated again",
    clearedSetting.value,
    secondValue,
  );
  TestValidator.equals("description cleared", clearedSetting.description, null);
  TestValidator.equals(
    "created_at unchanged on value update",
    clearedSetting.created_at,
    updatedSetting.created_at,
  );
  TestValidator.notEquals(
    "updated_at updated after value update",
    clearedSetting.updated_at,
    updatedSetting.updated_at,
  );
  TestValidator.equals(
    "deleted_at unchanged after value update",
    clearedSetting.deleted_at,
    updatedSetting.deleted_at,
  );

  // Step 5: Update attempt with non-existent key should fail
  await TestValidator.error(
    "update with non-existent key should fail",
    async () => {
      await api.functional.communityPlatform.administrator.systemSettings.update(
        connection,
        {
          key: `does_not_exist_${RandomGenerator.alphaNumeric(8)}`,
          body: {
            value: RandomGenerator.alphaNumeric(15),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    },
  );
}
