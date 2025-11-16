import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Validate updating multiple fields simultaneously in system settings.
 *
 * Tests that a moderator can update a system setting's value, type,
 * description, and active status all in a single PUT request. Verifies that all
 * changes are applied atomically and that the response contains the complete
 * updated configuration with refreshed timestamps.
 *
 * Flow:
 *
 * 1. Register a new moderator account
 * 2. Create an initial system setting
 * 3. Update multiple fields of the setting simultaneously
 * 4. Verify all fields were updated correctly
 * 5. Verify timestamps were updated
 * 6. Verify the response contains complete configuration
 */
export async function test_api_system_settings_update_multiple_fields(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(12),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create an initial system setting
  const initialSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: RandomGenerator.alphabets(20),
          settingValue: "false",
          settingType: "boolean",
          description: "Initial description",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(initialSetting);

  const initialCreatedAt = initialSetting.createdAt;
  const initialUpdatedAt = initialSetting.updatedAt;

  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 3. Update multiple fields of the setting simultaneously
  const updatedSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.update(
      connection,
      {
        settingKey: initialSetting.settingKey,
        body: {
          settingValue: "true",
          settingType: "boolean",
          description: "Updated description with multiple changes",
          isActive: false,
        } satisfies IDiscussionBoardSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedSetting);

  // 4. Verify all fields were updated correctly
  TestValidator.equals(
    "setting key should remain unchanged",
    updatedSetting.settingKey,
    initialSetting.settingKey,
  );

  TestValidator.equals(
    "setting value should be updated",
    updatedSetting.settingValue,
    "true",
  );

  TestValidator.equals(
    "setting type should remain boolean",
    updatedSetting.settingType,
    "boolean",
  );

  TestValidator.equals(
    "description should be updated",
    updatedSetting.description,
    "Updated description with multiple changes",
  );

  TestValidator.equals(
    "isActive should be set to false",
    updatedSetting.isActive,
    false,
  );

  // 5. Verify timestamps were updated
  TestValidator.equals(
    "created_at should not change",
    updatedSetting.createdAt,
    initialCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should be newer than initial",
    updatedSetting.updatedAt !== initialUpdatedAt,
  );

  // 6. Verify the response contains complete configuration
  TestValidator.predicate(
    "response should have id",
    updatedSetting.id !== null && updatedSetting.id !== undefined,
  );

  TestValidator.predicate(
    "response should have all required fields",
    updatedSetting.settingKey !== null &&
      updatedSetting.settingValue !== null &&
      updatedSetting.settingType !== null &&
      updatedSetting.isActive !== null &&
      updatedSetting.createdAt !== null &&
      updatedSetting.updatedAt !== null,
  );
}
