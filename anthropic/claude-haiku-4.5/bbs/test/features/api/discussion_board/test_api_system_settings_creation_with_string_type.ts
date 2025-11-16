import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test successful creation of a system setting with string data type.
 *
 * A moderator must first register an account and authenticate before they can
 * create system settings. This test validates the complete workflow:
 *
 * 1. Register a new moderator account
 * 2. Create a new system configuration setting with string type
 * 3. Verify the setting is created with correct properties and default values
 * 4. Confirm audit fields (createdAt, updatedAt) are properly set
 *
 * The test ensures that system settings are properly persisted with the
 * moderator's identity tracked for audit purposes.
 */
export async function test_api_system_settings_creation_with_string_type(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName = RandomGenerator.name();

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(authenticatedModerator);
  TestValidator.equals(
    "moderator authenticated successfully",
    authenticatedModerator.moderator.account_status,
    "active",
  );

  // Step 2: Create a system setting with string type
  const settingKey = "site_name";
  const settingValue = "My Discussion Board";
  const settingType = "string";
  const settingDescription =
    "The name of the discussion board displayed to users";

  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey,
          settingValue,
          settingType,
          description: settingDescription,
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);

  // Step 3: Validate the created setting has correct properties
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
  TestValidator.equals(
    "setting type matches",
    createdSetting.settingType,
    settingType,
  );
  TestValidator.equals(
    "setting description matches",
    createdSetting.description,
    settingDescription,
  );

  // Step 4: Validate default values
  TestValidator.equals(
    "setting is active by default",
    createdSetting.isActive,
    true,
  );

  // Step 5: Validate audit fields are set
  TestValidator.predicate(
    "created_at timestamp is set",
    () =>
      createdSetting.createdAt !== null &&
      createdSetting.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    () =>
      createdSetting.updatedAt !== null &&
      createdSetting.updatedAt !== undefined,
  );

  // Step 6: Validate the UUID identifier is properly formatted
  TestValidator.predicate("setting id is valid UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdSetting.id,
    ),
  );
}
