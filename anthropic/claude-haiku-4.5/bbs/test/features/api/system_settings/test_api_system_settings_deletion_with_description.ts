import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test deletion of a system setting that includes a descriptive explanation.
 *
 * This test validates that system settings with comprehensive metadata
 * (including descriptive information) can be properly created and then
 * completely deleted. The scenario verifies that deletion removes all
 * associated data including the setting's purpose, type, value, and
 * description.
 *
 * Process:
 *
 * 1. Authenticate as a moderator to gain system setting management privileges
 * 2. Create a system setting with full metadata:
 *
 *    - Unique settingKey identifier
 *    - Configuration value (settingValue)
 *    - Type specification (settingType)
 *    - Comprehensive description explaining purpose and impact
 * 3. Verify the setting was created successfully
 * 4. Delete the system setting by its settingKey
 * 5. Verify deletion response confirms complete removal
 */
export async function test_api_system_settings_deletion_with_description(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
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
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<100>
        >(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a system setting with comprehensive description
  const settingKey = `test_setting_${RandomGenerator.alphaNumeric(8)}`;
  const settingValue = "true";
  const settingType: "string" | "integer" | "boolean" | "json" = "boolean";
  const description = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey,
          settingValue,
          settingType,
          description,
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);

  // Step 3: Verify the setting was created with all metadata
  TestValidator.equals(
    "created setting key matches",
    createdSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "created setting value matches",
    createdSetting.settingValue,
    settingValue,
  );
  TestValidator.equals(
    "created setting type matches",
    createdSetting.settingType,
    settingType,
  );
  TestValidator.equals(
    "created setting description matches",
    createdSetting.description,
    description,
  );
  TestValidator.predicate(
    "created setting is active",
    createdSetting.isActive === true,
  );

  // Step 4: Delete the system setting by its settingKey
  const deletedSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.erase(
      connection,
      {
        settingKey,
      },
    );
  typia.assert(deletedSetting);

  // Step 5: Verify deletion response confirms removal of setting with description
  TestValidator.equals(
    "deleted setting key matches",
    deletedSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "deleted setting value matches",
    deletedSetting.settingValue,
    settingValue,
  );
  TestValidator.equals(
    "deleted setting type matches",
    deletedSetting.settingType,
    settingType,
  );
  TestValidator.equals(
    "deleted setting description preserved in response",
    deletedSetting.description,
    description,
  );

  // Step 6: Verify timestamps are valid
  TestValidator.predicate(
    "created timestamp is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdSetting.createdAt),
  );
  TestValidator.predicate(
    "updated timestamp is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdSetting.updatedAt),
  );
}
