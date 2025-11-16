import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

export async function test_api_system_settings_update_json_value_modification(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a JSON-type system setting with initial structure
  const initialJsonValue = JSON.stringify({ key1: "value1" });
  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: `json_config_${RandomGenerator.alphaNumeric(8)}`,
          settingValue: initialJsonValue,
          settingType: "json",
          description: "Test JSON configuration setting",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);
  TestValidator.equals(
    "initial setting type is json",
    createdSetting.settingType,
    "json",
  );
  TestValidator.equals(
    "initial setting value matches",
    createdSetting.settingValue,
    initialJsonValue,
  );

  // Step 3: Update the JSON setting to add a new configuration key
  const updatedJsonValue = JSON.stringify({
    key1: "value1",
    key2: "value2",
  });
  const updatedSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.update(
      connection,
      {
        settingKey: createdSetting.settingKey,
        body: {
          settingValue: updatedJsonValue,
          settingType: "json",
        } satisfies IDiscussionBoardSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedSetting);

  // Step 4: Validate the updated setting structure
  TestValidator.equals(
    "updated setting type is json",
    updatedSetting.settingType,
    "json",
  );
  TestValidator.equals(
    "updated setting value matches",
    updatedSetting.settingValue,
    updatedJsonValue,
  );
  TestValidator.notEquals(
    "setting value has been modified",
    updatedSetting.settingValue,
    createdSetting.settingValue,
  );

  // Step 5: Verify the JSON structure can be parsed correctly
  const parsedJson = JSON.parse(updatedSetting.settingValue);
  TestValidator.equals("parsed json contains key1", parsedJson.key1, "value1");
  TestValidator.equals("parsed json contains key2", parsedJson.key2, "value2");
  TestValidator.predicate(
    "updated setting is active",
    updatedSetting.isActive === true,
  );
}
