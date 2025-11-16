import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test deletion of a JSON-type system setting that contains complex structured
 * data.
 *
 * This test validates the complete lifecycle of a JSON system setting:
 *
 * 1. Authenticate as a moderator through account creation
 * 2. Create a JSON-type system setting with structured configuration data
 * 3. Verify the setting was created successfully
 * 4. Delete the setting by its key
 * 5. Verify the setting is properly removed
 *
 * This ensures JSON settings with complex data structures are properly handled
 * during deletion, validating both the deletion functionality and proper
 * handling of complex data types in the system configuration management.
 */
export async function test_api_system_settings_deletion_with_json_setting(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authenticated operations
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a JSON-type system setting with complex structured data
  const settingKey: string = `json_config_${RandomGenerator.alphaNumeric(8)}`;
  const jsonConfigValue = {
    feature: "enabled",
    level: 2,
    config: {
      timeout: 5000,
      retries: 3,
      options: ["option1", "option2"],
    },
  };
  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: settingKey,
          settingValue: JSON.stringify(jsonConfigValue),
          settingType: "json",
          description: "Complex JSON configuration for testing deletion",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);
  TestValidator.equals(
    "created setting key matches input",
    createdSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "created setting type is json",
    createdSetting.settingType,
    "json",
  );
  TestValidator.equals(
    "created setting value is correct",
    createdSetting.settingValue,
    JSON.stringify(jsonConfigValue),
  );
  TestValidator.predicate(
    "created setting is active by default",
    createdSetting.isActive,
  );

  // Step 3: Delete the system setting by its key
  const deletedSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.erase(
      connection,
      {
        settingKey: settingKey,
      },
    );
  typia.assert(deletedSetting);

  // Step 4: Verify the deletion response contains the deleted setting information
  TestValidator.equals(
    "deleted setting key matches",
    deletedSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "deleted setting type is json",
    deletedSetting.settingType,
    "json",
  );
  TestValidator.equals(
    "deleted setting value matches original",
    deletedSetting.settingValue,
    JSON.stringify(jsonConfigValue),
  );
}
