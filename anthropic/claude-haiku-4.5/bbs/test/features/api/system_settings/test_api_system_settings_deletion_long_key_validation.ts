import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test deletion of a system setting with a maximum-length setting key (up to
 * 100 characters as specified in schema).
 *
 * This test validates the deletion operation by creating a moderator account,
 * creating a system setting with a long descriptive key reaching the character
 * limit (100 characters), deleting the setting, and validating successful
 * deletion.
 *
 * Boundary test that ensures the deletion operation correctly handles keys at
 * the schema's maximum length constraint (100 characters), testing edge case
 * validation and proper resource cleanup.
 *
 * Steps:
 *
 * 1. Register a moderator account
 * 2. Create a system setting with a 100-character setting key
 * 3. Delete the system setting using the maximum-length key
 * 4. Verify the deleted setting is returned successfully
 */
export async function test_api_system_settings_deletion_long_key_validation(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a system setting with a maximum-length (100 characters) setting key
  // Generate a 100-character key that is descriptive
  const longSettingKey =
    "feature_flag_comprehensive_configuration_system_behavior_control_platform_operations_management_" + // 96 chars
    RandomGenerator.alphaNumeric(4); // 4 more chars to reach 100

  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: longSettingKey,
          settingValue: "true",
          settingType: "boolean",
          description:
            "Test setting with maximum length key for boundary validation",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);
  TestValidator.equals(
    "created setting key length",
    createdSetting.settingKey.length,
    100,
  );

  // Step 3: Delete the system setting using the maximum-length key
  const deletedSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.erase(
      connection,
      {
        settingKey: longSettingKey,
      },
    );
  typia.assert(deletedSetting);

  // Step 4: Verify the deleted setting matches the created setting
  TestValidator.equals(
    "deleted setting ID matches created setting",
    deletedSetting.id,
    createdSetting.id,
  );
  TestValidator.equals(
    "deleted setting key matches",
    deletedSetting.settingKey,
    longSettingKey,
  );
  TestValidator.equals(
    "deleted setting value matches",
    deletedSetting.settingValue,
    "true",
  );
}
