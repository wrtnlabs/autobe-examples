import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test retrieving a system setting with string type configuration.
 *
 * Validates the functionality of retrieving string-type system settings from
 * the discussion board. The test establishes moderator authentication and then
 * retrieves a predefined string-type setting to verify correct response
 * structure and data type handling.
 *
 * Steps:
 *
 * 1. Register a new moderator account for authentication
 * 2. Retrieve a string-type system setting using the moderator's credentials
 * 3. Validate that the response contains the correct settingType ('string')
 * 4. Verify that the settingValue and other fields are properly returned
 * 5. Confirm the setting is active and accessible
 */
export async function test_api_system_setting_retrieve_string_type(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(20),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve a string-type system setting using moderator credentials
  const stringSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.at(
      connection,
      {
        settingKey: "site_name",
      },
    );
  typia.assert(stringSetting);

  // Step 3: Validate that settingType is 'string'
  TestValidator.equals(
    "setting type should be string",
    stringSetting.settingType,
    "string",
  );

  // Step 4: Verify settingKey matches requested key
  TestValidator.equals(
    "setting key should match requested key",
    stringSetting.settingKey,
    "site_name",
  );

  // Step 5: Verify that setting value is not empty for string-type setting
  TestValidator.predicate(
    "string setting value should not be empty",
    stringSetting.settingValue.length > 0,
  );
}
