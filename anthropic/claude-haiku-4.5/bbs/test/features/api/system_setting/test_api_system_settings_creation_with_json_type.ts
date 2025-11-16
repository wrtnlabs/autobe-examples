import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test creation of system settings with JSON data type.
 *
 * This test validates that the discussion board system can properly handle and
 * store system configuration settings with complex JSON values. The moderator
 * account is created first, then a system setting is created with a JSON-type
 * value containing SMTP email configuration. The test verifies that the JSON
 * value is correctly stored as a string representation and can be retrieved
 * with proper formatting and structure intact.
 *
 * Test flow:
 *
 * 1. Register a new moderator account with valid credentials
 * 2. Create a system setting with settingType='json'
 * 3. Verify the setting was created with the correct JSON value
 * 4. Validate that the JSON structure is preserved as a string
 * 5. Confirm that isActive flag defaults to true for new settings
 */
export async function test_api_system_settings_creation_with_json_type(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword: string = typia.random<string & tags.MinLength<8>>();
  const moderatorDisplayName: string = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<100>
  >();

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAuth);
  TestValidator.predicate(
    "moderator should be authenticated",
    moderatorAuth.id !== null && moderatorAuth.id !== undefined,
  );

  // Step 2: Create a system setting with JSON type
  const emailConfigJson = {
    smtp_host: "mail.example.com",
    smtp_port: 587,
  };
  const emailConfigString: string = JSON.stringify(emailConfigJson);

  const systemSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: "email_config",
          settingValue: emailConfigString,
          settingType: "json",
          description: "Email configuration for SMTP server connectivity",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(systemSetting);

  // Step 3: Verify the setting was created with correct values
  TestValidator.equals(
    "setting key should match",
    systemSetting.settingKey,
    "email_config",
  );
  TestValidator.equals(
    "setting value should be JSON string",
    systemSetting.settingValue,
    emailConfigString,
  );
  TestValidator.equals(
    "setting type should be json",
    systemSetting.settingType,
    "json",
  );

  // Step 4: Validate that the JSON structure is preserved
  const parsedValue = JSON.parse(systemSetting.settingValue);
  TestValidator.equals(
    "parsed SMTP host should match",
    parsedValue.smtp_host,
    "mail.example.com",
  );
  TestValidator.equals(
    "parsed SMTP port should match",
    parsedValue.smtp_port,
    587,
  );

  // Step 5: Confirm that isActive flag defaults to true
  TestValidator.predicate(
    "setting should be active by default",
    systemSetting.isActive === true,
  );

  // Additional validation: Ensure timestamps are present
  TestValidator.predicate(
    "created timestamp should exist",
    systemSetting.createdAt !== null &&
      systemSetting.createdAt !== undefined &&
      systemSetting.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp should exist",
    systemSetting.updatedAt !== null &&
      systemSetting.updatedAt !== undefined &&
      systemSetting.updatedAt.length > 0,
  );
}
