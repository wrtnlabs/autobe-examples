import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test that deletion of a system setting properly records audit trail
 * information including deletion timestamp and moderator identity performing
 * the deletion.
 *
 * This test validates the audit trail functionality when system settings are
 * permanently deleted. Even though the setting is removed from the active
 * configuration, the deletion event must be properly logged with complete
 * information about who deleted it and when.
 *
 * **Test Steps:**
 *
 * 1. Create a moderator account to establish the actor for deletion
 * 2. Create a system setting with configuration values
 * 3. Record creation details (timestamp, moderator)
 * 4. Delete the system setting via the DELETE endpoint
 * 5. Verify the deletion response captures audit trail information
 * 6. Confirm deletion timestamp and moderator identity are recorded correctly
 */
export async function test_api_system_settings_deletion_preserves_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreate = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(15),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorResponse = await api.functional.auth.moderator.join(
    connection,
    {
      body: moderatorCreate,
    },
  );
  typia.assert(moderatorResponse);

  const moderatorId = moderatorResponse.id;
  const moderatorDisplayName = moderatorResponse.moderator.display_name;

  // Step 2: Create a system setting
  const settingKey = `test_setting_${RandomGenerator.alphaNumeric(8)}`;
  const settingValue = RandomGenerator.paragraph({ sentences: 3 });
  const settingDescription = RandomGenerator.paragraph({ sentences: 2 });

  const createSettingRequest = {
    settingKey: settingKey,
    settingValue: settingValue,
    settingType: "string" as const,
    description: settingDescription,
  } satisfies IDiscussionBoardSystemSetting.ICreate;

  const createdSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: createSettingRequest,
      },
    );
  typia.assert(createdSetting);

  // Step 3: Record creation details
  const creationTimestamp = createdSetting.createdAt;
  const creationModeratorId = createdSetting.updatedBy;

  TestValidator.equals(
    "setting key matches created value",
    createdSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "setting value matches created value",
    createdSetting.settingValue,
    settingValue,
  );
  TestValidator.equals(
    "setting is initially active",
    createdSetting.isActive,
    true,
  );

  // Step 4: Delete the system setting
  const deletedSetting =
    await api.functional.discussionBoard.moderator.systemSettings.erase(
      connection,
      {
        settingKey: settingKey,
      },
    );
  typia.assert(deletedSetting);

  // Step 5: Verify the deletion response captures audit trail information
  TestValidator.equals(
    "deleted setting key matches original",
    deletedSetting.settingKey,
    settingKey,
  );

  TestValidator.equals(
    "deleted setting value preserved in response",
    deletedSetting.settingValue,
    settingValue,
  );

  // Step 6: Confirm deletion timestamp and moderator identity are recorded
  TestValidator.predicate(
    "deletion updated timestamp is recorded",
    deletedSetting.updatedAt !== null && deletedSetting.updatedAt !== undefined,
  );

  TestValidator.predicate(
    "deletion timestamp is after or equal to creation timestamp",
    new Date(deletedSetting.updatedAt) >= new Date(creationTimestamp),
  );

  TestValidator.predicate(
    "moderator identity is recorded in audit trail",
    deletedSetting.updatedBy !== null && deletedSetting.updatedBy !== undefined,
  );

  // Verify that the setting metadata is preserved in the deletion response
  TestValidator.equals(
    "setting type preserved in deletion record",
    deletedSetting.settingType,
    "string",
  );

  TestValidator.equals(
    "setting description preserved in deletion record",
    deletedSetting.description,
    settingDescription,
  );

  // Validate that creation audit information is still present in the deletion response
  TestValidator.equals(
    "creation timestamp preserved in deletion record",
    deletedSetting.createdAt,
    creationTimestamp,
  );
}
