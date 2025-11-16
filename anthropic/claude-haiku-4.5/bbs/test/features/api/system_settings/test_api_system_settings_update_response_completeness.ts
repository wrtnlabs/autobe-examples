import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test that system setting update returns the complete updated configuration
 * with all fields.
 *
 * This test validates the PUT
 * /discussionBoard/moderator/systemSettings/{settingKey} endpoint returns a
 * fully populated response including all required and optional fields (id,
 * settingKey, settingValue, settingType, description, isActive, updatedBy,
 * createdAt, updatedAt).
 *
 * Steps:
 *
 * 1. Register a moderator account for authentication
 * 2. Create an initial system setting to obtain a valid settingKey
 * 3. Update the setting with new values
 * 4. Validate the response contains all expected fields with correct types and
 *    formats
 * 5. Verify updatedAt timestamp shows the update was recorded
 * 6. Confirm isActive, description, and other fields are properly returned
 */
export async function test_api_system_settings_update_response_completeness(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create an initial system setting
  const createBody = {
    settingKey: `test_setting_${RandomGenerator.alphaNumeric(8)}`,
    settingValue: "initial_value",
    settingType: "string" as const,
    description: "Test setting for update validation",
  } satisfies IDiscussionBoardSystemSetting.ICreate;

  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdSetting);

  // Step 3: Update the system setting with new values
  const updateBody = {
    settingValue: "updated_new_value",
    settingType: "string" as const,
    description: "Updated description for the setting",
    isActive: true,
  } satisfies IDiscussionBoardSystemSetting.IUpdate;

  const updatedSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.update(
      connection,
      {
        settingKey: createdSetting.settingKey,
        body: updateBody,
      },
    );
  typia.assert(updatedSetting);

  // Step 4: Validate response contains all required fields
  TestValidator.predicate(
    "response should contain id field",
    updatedSetting.id !== null && updatedSetting.id !== undefined,
  );

  TestValidator.predicate(
    "id should be a valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedSetting.id,
    ),
  );

  TestValidator.equals(
    "settingKey matches requested key",
    updatedSetting.settingKey,
    createdSetting.settingKey,
  );

  TestValidator.equals(
    "settingValue was updated",
    updatedSetting.settingValue,
    "updated_new_value",
  );

  TestValidator.equals(
    "settingType is correct",
    updatedSetting.settingType,
    "string",
  );

  TestValidator.equals(
    "description was updated",
    updatedSetting.description,
    "Updated description for the setting",
  );

  TestValidator.equals("isActive is true", updatedSetting.isActive, true);

  // Step 5: Verify timestamps
  TestValidator.predicate(
    "createdAt should be ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedSetting.createdAt),
  );

  TestValidator.predicate(
    "updatedAt should be ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedSetting.updatedAt),
  );

  // Verify updatedAt is after or equal to createdAt
  const createdTime = new Date(updatedSetting.createdAt).getTime();
  const updatedTime = new Date(updatedSetting.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt should reflect the update (later than or equal to createdAt)",
    updatedTime >= createdTime,
  );

  // Step 6: Verify updatedBy field existence (moderator who made the update)
  TestValidator.predicate(
    "updatedBy should be present",
    updatedSetting.updatedBy !== null && updatedSetting.updatedBy !== undefined,
  );

  // Validate complete response structure
  TestValidator.equals(
    "updated setting id matches created setting id",
    updatedSetting.id,
    createdSetting.id,
  );
}
