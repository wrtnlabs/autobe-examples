import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test retrieval of system settings with timestamp validation.
 *
 * This test validates that when a moderator retrieves a system setting, the
 * response includes both creation and modification timestamps in proper ISO
 * 8601 format. The test verifies:
 *
 * 1. Moderator authentication and session establishment
 * 2. System setting retrieval by key identifier
 * 3. Presence and validity of createdAt timestamp (immutable after creation)
 * 4. Presence and validity of updatedAt timestamp (reflects latest modification)
 * 5. Correct timestamp relationship (updatedAt >= createdAt)
 * 6. Complete setting structure with all required fields
 *
 * The timestamp validation ensures audit trail accuracy and supports tracking
 * configuration history for compliance and debugging purposes.
 */
export async function test_api_system_setting_retrieve_timestamps(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account to establish authenticated session
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve a system setting by its key identifier
  // Using a common system setting key that should exist in the system
  const settingKey = "site_name";
  const setting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.at(
      connection,
      {
        settingKey: settingKey,
      },
    );
  typia.assert(setting);

  // Step 3: Validate complete setting structure including timestamps
  // typia.assert() already validates:
  // - createdAt is a valid ISO 8601 date-time format
  // - updatedAt is a valid ISO 8601 date-time format
  // - All other required fields are properly typed

  // Step 4: Verify timestamp relationship - updatedAt must be >= createdAt
  const createdTime = new Date(setting.createdAt).getTime();
  const updatedTime = new Date(setting.updatedAt).getTime();

  TestValidator.predicate(
    "updatedAt timestamp should be greater than or equal to createdAt timestamp",
    updatedTime >= createdTime,
  );

  // Step 5: Verify setting key matches what was requested
  TestValidator.equals(
    "retrieved setting key should match requested key",
    setting.settingKey,
    settingKey,
  );
}
