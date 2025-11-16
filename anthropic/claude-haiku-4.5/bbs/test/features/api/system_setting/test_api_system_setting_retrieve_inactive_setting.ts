import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test retrieving an inactive system setting.
 *
 * Validates that moderators can retrieve system settings with isActive=false.
 * The test verifies that inactive settings are still accessible through the API
 * and that the isActive flag correctly reflects the setting's current state.
 *
 * Process:
 *
 * 1. Register a new moderator account to establish authentication
 * 2. Retrieve a system setting by its key
 * 3. Verify the setting is returned with isActive=false
 * 4. Validate all setting properties are properly populated
 */
export async function test_api_system_setting_retrieve_inactive_setting(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password:
          RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(4),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve an inactive system setting
  // Using a realistic setting key for testing
  const inactiveSettingKey = "maintenance_mode";

  const setting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.at(
      connection,
      {
        settingKey: inactiveSettingKey,
      },
    );
  typia.assert(setting);

  // Step 3: Verify the setting has isActive=false
  TestValidator.predicate("setting is inactive", !setting.isActive);

  // Step 4: Validate setting properties
  TestValidator.predicate(
    "setting key matches request",
    setting.settingKey === inactiveSettingKey,
  );

  TestValidator.predicate(
    "setting value is string",
    typeof setting.settingValue === "string",
  );

  TestValidator.predicate(
    "setting type is valid",
    ["string", "integer", "boolean", "json"].includes(setting.settingType),
  );

  TestValidator.predicate(
    "setting has valid creation timestamp",
    setting.createdAt !== null && setting.createdAt !== undefined,
  );

  TestValidator.predicate(
    "setting has valid update timestamp",
    setting.updatedAt !== null && setting.updatedAt !== undefined,
  );
}
