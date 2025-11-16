import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test retrieving an active system setting by moderator.
 *
 * Validates the functionality for retrieving system configuration settings that
 * are currently active and applied. This test ensures:
 *
 * 1. Moderator authentication works correctly via registration
 * 2. System setting retrieval returns correctly structured data
 * 3. Active settings (is_active=true) are properly returned
 * 4. Setting metadata includes all required fields with proper formats
 *
 * The test follows a complete workflow:
 *
 * 1. Register a new moderator account to establish authentication
 * 2. Retrieve a known active system setting by its key
 * 3. Validate the response structure and active status
 * 4. Verify setting values match expected types and formats
 */
export async function test_api_system_setting_retrieve_active_setting(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account to establish authentication
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

  // Verify moderator was created with active status
  TestValidator.predicate(
    "moderator should be authenticated with active status",
    moderator.moderator.account_status === "active",
  );

  // Step 2: Retrieve an active system setting
  // Use a common system setting key that should be configured in the system
  const settingKey = "site_name";
  const setting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.at(
      connection,
      {
        settingKey: settingKey,
      },
    );
  typia.assert(setting);

  // Step 3: Validate the setting structure and active status
  TestValidator.equals(
    "setting key should match the requested key",
    setting.settingKey,
    settingKey,
  );

  TestValidator.predicate(
    "setting should be active",
    setting.isActive === true,
  );

  // Step 4: Verify setting value types and formats
  TestValidator.predicate(
    "setting value should be a string",
    typeof setting.settingValue === "string",
  );

  TestValidator.predicate(
    "setting type should be one of valid types",
    ["string", "integer", "boolean", "json"].includes(setting.settingType),
  );

  // Verify timestamps are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "created_at should be valid ISO 8601 date-time",
    !isNaN(new Date(setting.createdAt).getTime()),
  );

  TestValidator.predicate(
    "updated_at should be valid ISO 8601 date-time",
    !isNaN(new Date(setting.updatedAt).getTime()),
  );

  // Step 5: Verify the setting is truly active and applicable
  TestValidator.equals(
    "active setting should have isActive flag set to true",
    setting.isActive,
    true,
  );

  // Step 6: Verify id field exists and is a valid UUID
  TestValidator.predicate(
    "setting id should be a valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      setting.id,
    ),
  );
}
