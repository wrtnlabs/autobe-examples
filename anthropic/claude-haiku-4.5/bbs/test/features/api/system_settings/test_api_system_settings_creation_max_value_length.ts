import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test system setting creation with maximum allowed settingValue length.
 *
 * A moderator creates a setting with a 10,000-character settingValue at the
 * maximum allowed boundary, testing complex configuration storage. Validates
 * that the system correctly handles very long configuration values for storing
 * large JSON or text configurations.
 *
 * Test flow:
 *
 * 1. Register a new moderator account for authentication
 * 2. Create a system setting with a 10,000-character settingValue
 * 3. Validate that the setting is created successfully
 * 4. Verify that the response contains the complete settingValue
 * 5. Confirm that all required fields are properly populated
 */
export async function test_api_system_settings_creation_max_value_length(
  connection: api.IConnection,
) {
  // 1. Register a moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(15),
        password: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a system setting with maximum length settingValue (10,000 chars)
  // Generate content and ensure exactly 10,000 characters
  let maxLengthValue: string = RandomGenerator.content({
    paragraphs: 50,
    sentenceMin: 20,
    sentenceMax: 30,
    wordMin: 4,
    wordMax: 8,
  });

  // Trim or pad to exactly 10,000 characters
  if (maxLengthValue.length > 10000) {
    maxLengthValue = maxLengthValue.substring(0, 10000);
  } else if (maxLengthValue.length < 10000) {
    maxLengthValue = maxLengthValue.padEnd(10000, " ");
  }

  const setting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: `test_max_value_${RandomGenerator.alphaNumeric(8)}`,
          settingValue: maxLengthValue,
          settingType: "json",
          description: "Test setting with maximum allowed value length",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(setting);

  // 3. Verify the created setting
  TestValidator.equals(
    "setting value matches input",
    setting.settingValue,
    maxLengthValue,
  );
  TestValidator.equals(
    "setting value length is 10000 characters",
    setting.settingValue.length,
    10000,
  );
  TestValidator.equals("setting type is json", setting.settingType, "json");
  TestValidator.equals("setting is active", setting.isActive, true);
  TestValidator.predicate(
    "setting has valid description",
    setting.description !== null && setting.description !== undefined,
  );
}
