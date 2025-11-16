import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

export async function test_api_system_settings_creation_with_integer_type(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a system setting with integer type
  const settingKey = "max_articles_per_day";
  const settingValue = "100";

  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: settingKey,
          settingValue: settingValue,
          settingType: "integer",
          description: "Maximum number of articles a user can create per day",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);

  // Step 3: Validate the created setting
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
    "setting type is integer",
    createdSetting.settingType,
    "integer",
  );
  TestValidator.predicate(
    "setting is active by default",
    createdSetting.isActive === true,
  );

  // Step 4: Verify integer-typed setting has proper structure
  TestValidator.predicate(
    "setting value is numeric string",
    /^\d+$/.test(createdSetting.settingValue),
  );

  // Step 5: Create another setting with string type to distinguish
  const stringSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: "site_name",
          settingValue: "My Discussion Board",
          settingType: "string",
          description: "Name of the discussion board site",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(stringSetting);

  // Step 6: Validate type distinction between settings
  TestValidator.notEquals(
    "integer and string settings have different types",
    createdSetting.settingType,
    stringSetting.settingType,
  );
}
