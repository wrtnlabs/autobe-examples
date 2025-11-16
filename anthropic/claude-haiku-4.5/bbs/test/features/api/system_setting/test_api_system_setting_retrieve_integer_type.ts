import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test retrieving a system setting with integer type constraint.
 *
 * A moderator authenticates with valid credentials and retrieves a specific
 * integer-type configuration setting (e.g., 'max_articles_per_day'). The test
 * verifies that the API correctly returns a setting with settingType='integer',
 * the settingValue is a numeric string that can be parsed as an integer, and
 * all required fields are present in the response. This validates the system's
 * ability to handle type-specific setting retrieval for integer configurations
 * used in rate limiting and quota management.
 *
 * Test flow:
 *
 * 1. Register a new moderator account to establish authentication context
 * 2. Retrieve an integer-type system setting using the moderator's session
 * 3. Verify the setting has settingType='integer'
 * 4. Verify settingValue is a numeric string that can be parsed as integer
 * 5. Validate all required response fields are present and properly typed
 */
export async function test_api_system_setting_retrieve_integer_type(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorDisplayName = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<100>
  >();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      display_name: moderatorDisplayName,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Retrieve an integer-type system setting
  const integerSettingKey = "max_articles_per_day";
  const setting =
    await api.functional.discussionBoard.moderator.systemSettings.at(
      connection,
      {
        settingKey: integerSettingKey,
      },
    );
  typia.assert(setting);

  // Step 3: Verify the setting has settingType='integer'
  TestValidator.equals(
    "setting type should be integer",
    setting.settingType,
    "integer",
  );

  // Step 4: Verify settingValue is a numeric string that can be parsed as integer
  const parsedValue = parseInt(setting.settingValue, 10);
  TestValidator.predicate(
    "setting value should be a valid integer string",
    !isNaN(parsedValue),
  );

  // Step 5: Validate all required response fields are present and properly typed
  TestValidator.predicate(
    "setting should have id field",
    typeof setting.id === "string" && setting.id.length > 0,
  );
  TestValidator.predicate(
    "setting should have settingKey field",
    typeof setting.settingKey === "string" && setting.settingKey.length > 0,
  );
  TestValidator.predicate(
    "setting should have settingValue field",
    typeof setting.settingValue === "string",
  );
  TestValidator.predicate(
    "setting should have isActive field",
    typeof setting.isActive === "boolean",
  );
  TestValidator.predicate(
    "setting should have createdAt field",
    typeof setting.createdAt === "string" && setting.createdAt.length > 0,
  );
  TestValidator.predicate(
    "setting should have updatedAt field",
    typeof setting.updatedAt === "string" && setting.updatedAt.length > 0,
  );
}
