import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Validates the retrieval of a specific system setting by its unique setting
 * key.
 *
 * This test verifies that moderators can successfully retrieve individual
 * system settings from the discussion board platform. System settings are
 * key-value configuration pairs that control platform behavior and features,
 * including site metadata, feature flags, moderation settings, rate limiting
 * parameters, and system behavior controls.
 *
 * The test workflow:
 *
 * 1. Register a new moderator account through the join endpoint
 * 2. Retrieve a specific system setting using its setting key identifier
 * 3. Validate that the returned setting matches the expected DTO structure
 * 4. Verify the setting contains valid data consistent with the API contract
 */
export async function test_api_system_setting_retrieve_by_key(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve a specific system setting
  const setting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.at(
      connection,
      {
        settingKey: "maintenance_mode",
      },
    );
  typia.assert(setting);

  // Step 3: Validate the setting matches expected structure
  // typia.assert() already validates all types, formats, and field existence
  // Focus on business logic validation

  TestValidator.equals(
    "setting key should match the requested key",
    setting.settingKey,
    "maintenance_mode",
  );

  TestValidator.predicate(
    "setting should have a valid value",
    setting.settingValue.length > 0,
  );

  TestValidator.predicate(
    "setting type should be one of the allowed types",
    ["string", "integer", "boolean", "json"].includes(setting.settingType),
  );

  TestValidator.predicate(
    "setting should have consistent timestamps",
    new Date(setting.createdAt) <= new Date(setting.updatedAt),
  );
}
