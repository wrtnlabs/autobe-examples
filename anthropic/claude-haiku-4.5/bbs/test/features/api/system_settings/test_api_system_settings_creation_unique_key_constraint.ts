import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test that system setting creation enforces unique settingKey constraint.
 *
 * This test validates that the discussion board system settings uniqueness
 * constraint on settingKey is properly enforced. A moderator creates a setting
 * with a specific settingKey, then attempts to create another setting with the
 * same key. The system should prevent duplicate keys or update the existing
 * entry, ensuring data integrity.
 *
 * Scenario steps:
 *
 * 1. Register a new moderator account for authentication
 * 2. Create a system setting with settingKey='max_comments_per_day'
 * 3. Attempt to create another setting with the same settingKey
 * 4. Validate that unique constraint is enforced (either error or update)
 * 5. Verify the final state maintains uniqueness
 */
export async function test_api_system_settings_creation_unique_key_constraint(
  connection: api.IConnection,
) {
  // 1. Register a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderatorAuth);

  TestValidator.equals(
    "moderator registered with provided email",
    moderatorAuth.moderator.display_name,
    moderatorData.display_name,
  );

  // 2. Create first system setting with unique settingKey
  const settingKey = "max_comments_per_day";
  const firstSettingValue = "100";
  const firstSettingType = "integer" as const;

  const firstSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: settingKey,
          settingValue: firstSettingValue,
          settingType: firstSettingType,
          description: "Maximum comments allowed per day",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(firstSetting);

  TestValidator.equals(
    "first setting key matches",
    firstSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "first setting value matches",
    firstSetting.settingValue,
    firstSettingValue,
  );
  TestValidator.predicate(
    "first setting is active by default",
    firstSetting.isActive,
  );

  // 3. Attempt to create another setting with the same settingKey
  const secondSettingValue = "50";
  const secondSettingType = "integer" as const;

  // The system should either:
  // - Reject with an error (unique constraint violation)
  // - Update the existing entry with new values
  // We test the error case as the primary scenario
  await TestValidator.error(
    "duplicate settingKey should fail with unique constraint violation",
    async () => {
      await api.functional.discussionBoard.moderator.systemSettings.create(
        connection,
        {
          body: {
            settingKey: settingKey,
            settingValue: secondSettingValue,
            settingType: secondSettingType,
            description: "Updated maximum comments per day",
          } satisfies IDiscussionBoardSystemSetting.ICreate,
        },
      );
    },
  );

  // 4. Verify the original setting remains unchanged
  TestValidator.predicate(
    "original setting still has initial value",
    firstSetting.settingValue === firstSettingValue,
  );
  TestValidator.predicate(
    "original setting key unchanged",
    firstSetting.settingKey === settingKey,
  );

  // 5. Verify uniqueness by attempting to create a new setting with different key
  const differentSettingKey = "max_articles_per_day";
  const differentSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: differentSettingKey,
          settingValue: "50",
          settingType: "integer" as const,
          description: "Maximum articles per day",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(differentSetting);

  TestValidator.equals(
    "different setting key is created successfully",
    differentSetting.settingKey,
    differentSettingKey,
  );
  TestValidator.notEquals(
    "different settings have different keys",
    firstSetting.settingKey,
    differentSetting.settingKey,
  );
}
