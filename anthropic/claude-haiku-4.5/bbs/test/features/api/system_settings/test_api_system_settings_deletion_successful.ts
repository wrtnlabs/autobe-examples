import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Validates the successful deletion of a system setting by a moderator.
 *
 * This test scenario covers the complete workflow for managing system settings:
 *
 * 1. Moderator Registration: Creates a new moderator account with valid
 *    credentials
 * 2. Setting Creation: Creates a system setting with a specific key and
 *    configuration
 * 3. Setting Deletion: Deletes the created setting by its key
 * 4. Verification: Confirms the deleted setting is returned in the response
 *
 * The test ensures that moderators can successfully delete system settings and
 * that the deletion response confirms the removal with the original setting
 * data.
 */
export async function test_api_system_settings_deletion_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<100>
    >(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a system setting
  const settingData = {
    settingKey: "maintenance_mode",
    settingValue: "false",
    settingType: "boolean" as const,
    description: "Controls whether the system is in maintenance mode",
  } satisfies IDiscussionBoardSystemSetting.ICreate;

  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: settingData,
      },
    );
  typia.assert(createdSetting);

  // Step 3: Verify the created setting has the expected properties
  TestValidator.equals(
    "created setting key matches",
    createdSetting.settingKey,
    "maintenance_mode",
  );
  TestValidator.equals(
    "created setting value matches",
    createdSetting.settingValue,
    "false",
  );
  TestValidator.equals(
    "created setting type matches",
    createdSetting.settingType,
    "boolean",
  );
  TestValidator.predicate(
    "created setting is active",
    createdSetting.isActive === true,
  );

  // Step 4: Delete the system setting
  const deletedSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.erase(
      connection,
      {
        settingKey: "maintenance_mode",
      },
    );
  typia.assert(deletedSetting);

  // Step 5: Verify the deleted setting matches the original
  TestValidator.equals(
    "deleted setting key matches original",
    deletedSetting.settingKey,
    createdSetting.settingKey,
  );
  TestValidator.equals(
    "deleted setting value matches original",
    deletedSetting.settingValue,
    createdSetting.settingValue,
  );
  TestValidator.equals(
    "deleted setting type matches original",
    deletedSetting.settingType,
    createdSetting.settingType,
  );
  TestValidator.equals(
    "deleted setting ID matches original",
    deletedSetting.id,
    createdSetting.id,
  );
}
