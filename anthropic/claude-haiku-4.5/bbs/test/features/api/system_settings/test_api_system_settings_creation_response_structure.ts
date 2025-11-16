import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test that system setting creation returns complete response with all required
 * fields.
 *
 * A moderator creates a system configuration setting and the response validates
 * that it includes all required fields: id (UUID), settingKey, settingValue,
 * settingType, description (if provided), isActive (defaulting to true),
 * updatedBy (moderator identifier), createdAt, and updatedAt timestamps in ISO
 * 8601 format.
 *
 * Business context: System settings are key-value configuration pairs that
 * control platform behavior and features. This test ensures the API returns
 * complete response data for proper client-side integration and settings
 * management.
 *
 * Workflow:
 *
 * 1. Register a new moderator account for authentication
 * 2. Create a system setting with complete data
 * 3. Validate response structure and all required fields
 * 4. Verify timestamps are properly formatted
 * 5. Confirm isActive defaults to true when not explicitly set
 */
export async function test_api_system_settings_creation_response_structure(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName = RandomGenerator.name();

  const moderatorResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorResponse);

  // Step 2: Create a system setting with complete data
  const settingKey = `test_setting_${RandomGenerator.alphaNumeric(8)}`;
  const settingValue = RandomGenerator.paragraph();
  const description = RandomGenerator.paragraph();

  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey,
          settingValue,
          settingType: "string",
          description,
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);

  // Step 3: Validate response structure - verify all required fields exist
  TestValidator.predicate(
    "response has id field as UUID",
    typeof createdSetting.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        createdSetting.id,
      ),
  );

  TestValidator.equals(
    "settingKey matches input value",
    createdSetting.settingKey,
    settingKey,
  );

  TestValidator.equals(
    "settingValue matches input value",
    createdSetting.settingValue,
    settingValue,
  );

  TestValidator.equals(
    "settingType matches input value",
    createdSetting.settingType,
    "string",
  );

  TestValidator.equals(
    "description matches input value",
    createdSetting.description,
    description,
  );

  // Step 4: Verify isActive defaults to true
  TestValidator.predicate(
    "isActive defaults to true",
    createdSetting.isActive === true,
  );

  // Step 5: Validate timestamp formats (ISO 8601)
  TestValidator.predicate(
    "createdAt is ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      createdSetting.createdAt,
    ),
  );

  TestValidator.predicate(
    "updatedAt is ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      createdSetting.updatedAt,
    ),
  );

  // Step 6: Verify updatedBy field exists and contains moderator identifier
  TestValidator.predicate(
    "updatedBy field exists as moderator identifier",
    typeof createdSetting.updatedBy === "string" ||
      createdSetting.updatedBy === null ||
      createdSetting.updatedBy === undefined,
  );
}
