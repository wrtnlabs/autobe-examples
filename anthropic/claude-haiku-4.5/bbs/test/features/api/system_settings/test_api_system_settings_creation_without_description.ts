import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test system setting creation without providing the optional description
 * field.
 *
 * This test validates that the system allows creating a configuration setting
 * with only the required fields (settingKey, settingValue, settingType) while
 * omitting the optional description field. This ensures the API supports
 * flexible configuration management where administrators can create settings
 * quickly without providing descriptive information.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account via the join endpoint
 * 2. Create a system setting with only required fields (no description)
 * 3. Verify the setting was created successfully with expected values
 * 4. Confirm the optional description field is either null/undefined or omitted
 */
export async function test_api_system_settings_creation_without_description(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a system setting without description
  const settingKey = "support_email";
  const settingValue = "support@example.com";
  const settingType = "string" as const;

  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey,
          settingValue,
          settingType,
          // description is intentionally omitted
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);

  // Step 3: Verify the setting was created with expected values
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
    "setting type matches",
    createdSetting.settingType,
    settingType,
  );

  // Step 4: Verify the setting has expected default properties
  TestValidator.predicate(
    "setting has unique ID",
    createdSetting.id.length > 0,
  );
  TestValidator.predicate(
    "setting is active by default",
    createdSetting.isActive === true,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    createdSetting.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    createdSetting.updatedAt.length > 0,
  );

  // Step 5: Confirm optional description field handling
  TestValidator.predicate(
    "description is optional (null, undefined, or omitted)",
    createdSetting.description === null ||
      createdSetting.description === undefined ||
      typeof createdSetting.description === "string",
  );
}
