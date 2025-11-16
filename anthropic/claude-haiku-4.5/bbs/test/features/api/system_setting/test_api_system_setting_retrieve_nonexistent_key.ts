import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Validates error handling when retrieving a nonexistent system setting.
 *
 * Tests that the system properly handles requests for setting keys that do not
 * exist in the system settings table. A moderator authenticates and then
 * attempts to retrieve a setting with a nonexistent key, verifying that the API
 * returns an appropriate 404 error response instead of null or crash.
 *
 * Process:
 *
 * 1. Register and authenticate a new moderator account
 * 2. Attempt to retrieve a system setting with a nonexistent setting key
 * 3. Verify that the API returns a 404 Not Found error
 */
export async function test_api_system_setting_retrieve_nonexistent_key(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(20) satisfies string as string,
        password: RandomGenerator.alphaNumeric(12) satisfies string as string,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate a nonexistent setting key that won't exist in the system
  const nonexistentSettingKey = `nonexistent_setting_${RandomGenerator.alphaNumeric(16)}`;

  // Step 3: Attempt to retrieve the nonexistent setting and verify it returns 404 error
  await TestValidator.error(
    "should return 404 error when retrieving nonexistent setting key",
    async () => {
      await api.functional.discussionBoard.moderator.systemSettings.at(
        connection,
        {
          settingKey: nonexistentSettingKey,
        },
      );
    },
  );
}
