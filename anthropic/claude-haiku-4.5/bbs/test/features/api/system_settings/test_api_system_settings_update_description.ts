import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test updating the description field of an existing system setting.
 *
 * A moderator creates a setting with an initial description, then updates only
 * the description to provide more detailed guidance for future administrators.
 * This validates that descriptive metadata can be maintained and improved over
 * time.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account to establish authentication context
 * 2. Create a system setting with initial description
 * 3. Update the setting to modify only the description field
 * 4. Verify the updated description is persisted correctly
 * 5. Confirm other setting properties remain unchanged
 */
export async function test_api_system_settings_update_description(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create a system setting with initial description
  const settingKey = `test_setting_${RandomGenerator.alphaNumeric(8)}`;
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });

  const createdSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: settingKey,
          settingValue: "true",
          settingType: "boolean",
          description: initialDescription,
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);

  TestValidator.equals(
    "created setting has initial description",
    createdSetting.description,
    initialDescription,
  );
  TestValidator.equals(
    "created setting key matches",
    createdSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "created setting value is correct",
    createdSetting.settingValue,
    "true",
  );
  TestValidator.equals(
    "created setting type is correct",
    createdSetting.settingType,
    "boolean",
  );

  // 3. Update the setting to modify only the description field
  const updatedDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const updatedSetting =
    await api.functional.discussionBoard.moderator.systemSettings.update(
      connection,
      {
        settingKey: settingKey,
        body: {
          description: updatedDescription,
        } satisfies IDiscussionBoardSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedSetting);

  // 4. Verify the updated description is persisted correctly
  TestValidator.equals(
    "updated setting has new description",
    updatedSetting.description,
    updatedDescription,
  );
  TestValidator.notEquals(
    "description changed from initial value",
    updatedSetting.description,
    initialDescription,
  );

  // 5. Confirm other setting properties remain unchanged
  TestValidator.equals(
    "setting key unchanged after update",
    updatedSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "setting value unchanged after description update",
    updatedSetting.settingValue,
    createdSetting.settingValue,
  );
  TestValidator.equals(
    "setting type unchanged after description update",
    updatedSetting.settingType,
    createdSetting.settingType,
  );
  TestValidator.equals(
    "setting active status preserved",
    updatedSetting.isActive,
    createdSetting.isActive,
  );
}
