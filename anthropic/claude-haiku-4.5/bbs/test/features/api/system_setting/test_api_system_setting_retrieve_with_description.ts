import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test that retrieved setting includes human-readable description.
 *
 * This test validates that when a moderator retrieves a system setting, the
 * response includes a description field that provides meaningful context about
 * the setting's purpose and impact to administrators. The description helps
 * administrators understand what each configuration controls.
 *
 * Test flow:
 *
 * 1. Register a new moderator account to establish authenticated session
 * 2. Retrieve a system setting by its key
 * 3. Verify that the setting includes a description field that is either:
 *
 *    - Populated with meaningful text explaining the setting's purpose
 *    - Null if no description is provided
 * 4. Validate the complete setting response structure
 */
export async function test_api_system_setting_retrieve_with_description(
  connection: api.IConnection,
) {
  // Step 1: Register moderator
  const moderatorCreated = await api.functional.auth.moderator.join(
    connection,
    {
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
    },
  );
  typia.assert(moderatorCreated);

  // Step 2: Retrieve a system setting with common setting key
  const settingKey = "site_name";
  const setting =
    await api.functional.discussionBoard.moderator.systemSettings.at(
      connection,
      {
        settingKey,
      },
    );
  typia.assert(setting);

  // Step 3: Validate the setting response structure
  TestValidator.equals("setting key matches", setting.settingKey, settingKey);

  // Step 4: Verify description field exists and is populated or null
  // The description should be either a meaningful string or null/undefined
  if (setting.description !== null && setting.description !== undefined) {
    TestValidator.predicate(
      "description should be non-empty string when provided",
      setting.description.length > 0,
    );
  }

  // Step 5: Validate other essential setting fields
  TestValidator.predicate(
    "setting value should be populated",
    setting.settingValue.length > 0,
  );

  TestValidator.predicate(
    "setting type should be one of valid types",
    ["string", "integer", "boolean", "json"].includes(setting.settingType),
  );

  TestValidator.predicate(
    "setting should have is_active status",
    typeof setting.isActive === "boolean",
  );

  TestValidator.predicate(
    "created_at should be valid timestamp",
    typeof setting.createdAt === "string" && setting.createdAt.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be valid timestamp",
    typeof setting.updatedAt === "string" && setting.updatedAt.length > 0,
  );
}
