import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

export async function test_api_system_settings_update_active_status(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName = RandomGenerator.name();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator account created successfully",
    moderator.moderator.account_status,
    "active",
  );

  // Step 2: Create an active system setting
  const settingKey = `test_setting_${RandomGenerator.alphabets(6)}`;
  const settingValue = "true";
  const settingType = "boolean" as const;
  const description = RandomGenerator.paragraph({ sentences: 2 });

  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey,
          settingValue,
          settingType,
          description,
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);
  TestValidator.equals(
    "setting created with active status",
    createdSetting.isActive,
    true,
  );
  TestValidator.equals(
    "setting key matches",
    createdSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "setting value matches",
    createdSetting.settingValue,
    settingValue,
  );

  // Step 3: Update the setting to disable it (isActive = false)
  const updatedSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.update(
      connection,
      {
        settingKey,
        body: {
          isActive: false,
        } satisfies IDiscussionBoardSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedSetting);
  TestValidator.equals(
    "setting disabled successfully",
    updatedSetting.isActive,
    false,
  );

  // Step 4: Verify the setting still exists with original data preserved
  TestValidator.equals(
    "setting key unchanged after update",
    updatedSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "setting value preserved",
    updatedSetting.settingValue,
    settingValue,
  );
  TestValidator.equals(
    "setting type preserved",
    updatedSetting.settingType,
    settingType,
  );

  // Step 5: Verify id and timestamps are properly set
  TestValidator.predicate(
    "setting has valid id format",
    updatedSetting.id.length > 0,
  );
  TestValidator.predicate(
    "setting has created timestamp",
    updatedSetting.createdAt !== undefined && updatedSetting.createdAt !== null,
  );
  TestValidator.predicate(
    "setting has updated timestamp",
    updatedSetting.updatedAt !== undefined && updatedSetting.updatedAt !== null,
  );

  // Step 6: Validate core functionality - isActive toggle from true to false
  TestValidator.predicate(
    "disable mechanism works correctly",
    createdSetting.isActive === true && updatedSetting.isActive === false,
  );

  // Step 7: Verify setting configuration is retained for audit purposes
  TestValidator.equals(
    "original setting id maintained",
    createdSetting.id,
    updatedSetting.id,
  );
}
