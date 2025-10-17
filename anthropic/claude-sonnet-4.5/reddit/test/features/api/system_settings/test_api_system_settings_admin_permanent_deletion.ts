import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test permanent deletion of system configuration settings by administrators.
 *
 * This test validates the hard delete operation on system settings, confirming
 * that:
 *
 * 1. Administrators can authenticate and obtain proper credentials
 * 2. Administrators can create system configuration settings
 * 3. Administrators can permanently delete settings using the erase endpoint
 * 4. The deletion operation completes successfully (indicated by void return)
 *
 * Workflow:
 *
 * 1. Create admin account via join endpoint
 * 2. Create a system setting with valid configuration data
 * 3. Permanently delete the setting by ID
 * 4. Verify successful deletion (void return confirms completion)
 */
export async function test_api_system_settings_admin_permanent_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create a system setting
  const settingData = {
    key: `test_setting_${RandomGenerator.alphaNumeric(8)}`,
    value: RandomGenerator.alphaNumeric(20),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    value_type: RandomGenerator.pick([
      "string",
      "int",
      "double",
      "boolean",
      "json",
    ] as const),
    category: RandomGenerator.pick([
      "content",
      "moderation",
      "performance",
      "features",
    ] as const),
    is_public: RandomGenerator.pick([true, false] as const),
  } satisfies IRedditLikeSystemSetting.ICreate;

  const createdSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: settingData,
    });
  typia.assert(createdSetting);

  // Validate created setting properties match input
  TestValidator.equals(
    "setting key matches",
    createdSetting.key,
    settingData.key,
  );
  TestValidator.equals(
    "setting value matches",
    createdSetting.value,
    settingData.value,
  );
  TestValidator.equals(
    "setting value_type matches",
    createdSetting.value_type,
    settingData.value_type,
  );
  TestValidator.equals(
    "setting is_public matches",
    createdSetting.is_public,
    settingData.is_public,
  );

  // Step 3: Permanently delete the system setting
  await api.functional.redditLike.admin.system.settings.erase(connection, {
    id: createdSetting.id,
  });

  // Step 4: The void return indicates successful deletion
  // No further validation needed as the function would throw an error if deletion failed
}
