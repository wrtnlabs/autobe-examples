import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test that setting key deletion is case-sensitive and requires exact match.
 *
 * This test validates the case-sensitive behavior of system setting key
 * deletion. It creates multiple settings with similar keys that differ only in
 * case (e.g., 'maintenance_mode' and 'Maintenance_Mode'), then attempts to
 * delete one by exact key match. The test verifies that only the setting with
 * the exact matching key is deleted, while other case-variant settings remain
 * in the system.
 *
 * The test flow:
 *
 * 1. Register a moderator to establish authentication
 * 2. Create first setting with lowercase key 'maintenance_mode'
 * 3. Create second setting with mixed-case key 'Maintenance_Mode'
 * 4. Delete the first setting by exact key match
 * 5. Verify the first setting is deleted
 * 6. Verify the second setting still exists (case-sensitivity confirmed)
 */
export async function test_api_system_settings_deletion_case_sensitive_key(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator for authentication
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create first setting with lowercase key
  const setting1: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: "maintenance_mode",
          settingValue: "false",
          settingType: "boolean",
          description: "Maintenance mode setting in lowercase",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(setting1);
  TestValidator.equals(
    "first setting key matches lowercase",
    setting1.settingKey,
    "maintenance_mode",
  );

  // Step 3: Create second setting with mixed-case key
  const setting2: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: "Maintenance_Mode",
          settingValue: "true",
          settingType: "boolean",
          description: "Maintenance mode setting with mixed case",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(setting2);
  TestValidator.equals(
    "second setting key matches mixed case",
    setting2.settingKey,
    "Maintenance_Mode",
  );

  // Step 4: Delete the first setting by exact key match (lowercase)
  const deletedSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.erase(
      connection,
      {
        settingKey: "maintenance_mode",
      },
    );
  typia.assert(deletedSetting);
  TestValidator.equals(
    "deleted setting matches first setting",
    deletedSetting.id,
    setting1.id,
  );

  // Step 5: Verify the first setting is deleted
  TestValidator.equals(
    "deleted setting key is lowercase",
    deletedSetting.settingKey,
    "maintenance_mode",
  );

  // Step 6: Verify the second setting still exists (case-sensitivity confirmed)
  // Attempt to delete the second setting to confirm it exists separately
  const deletedSetting2: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.erase(
      connection,
      {
        settingKey: "Maintenance_Mode",
      },
    );
  typia.assert(deletedSetting2);
  TestValidator.equals(
    "second setting with mixed case still exists and can be deleted",
    deletedSetting2.id,
    setting2.id,
  );
  TestValidator.notEquals(
    "second setting has different key than first setting",
    deletedSetting2.settingKey,
    deletedSetting.settingKey,
  );
}
