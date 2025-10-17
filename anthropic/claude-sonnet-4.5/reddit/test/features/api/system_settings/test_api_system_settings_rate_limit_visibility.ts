import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test that rate limiting thresholds visible to users are properly exposed
 * through public system settings.
 *
 * Retrieves public system settings and validates the presence and configuration
 * of rate limiting parameters. Ensures users can see platform usage constraints
 * like posts_per_hour_limit, comments_per_minute_limit, and
 * votes_per_minute_limit to understand platform limitations and avoid
 * frustration.
 *
 * Steps:
 *
 * 1. Retrieve all public system settings via GET /redditLike/system/settings
 * 2. Validate response structure with typia.assert()
 * 3. Verify rate limiting settings are present in the response
 * 4. Check that rate limit settings have proper metadata (description, value_type,
 *    public visibility)
 * 5. Ensure rate limit settings are marked as public for user transparency
 */
export async function test_api_system_settings_rate_limit_visibility(
  connection: api.IConnection,
) {
  // Retrieve public system settings
  const settingsResponse: IRedditLikeSystemSetting.IPublicList =
    await api.functional.redditLike.system.settings.index(connection);

  // Validate response structure
  typia.assert(settingsResponse);

  // Verify settings array exists and is not empty
  TestValidator.predicate(
    "settings array should exist",
    settingsResponse.settings !== undefined &&
      settingsResponse.settings !== null,
  );

  TestValidator.predicate(
    "settings array should not be empty",
    settingsResponse.settings.length > 0,
  );

  // Define expected rate limiting setting keys
  const rateLimitKeys = [
    "posts_per_hour_limit",
    "comments_per_minute_limit",
    "votes_per_minute_limit",
  ];

  // Check for presence of rate limiting settings
  for (const expectedKey of rateLimitKeys) {
    const rateLimitSetting = settingsResponse.settings.find(
      (setting) => setting.key === expectedKey,
    );

    if (rateLimitSetting) {
      typia.assert(rateLimitSetting);

      // Verify the setting is marked as public
      TestValidator.equals(
        `${expectedKey} should be public`,
        rateLimitSetting.is_public,
        true,
      );

      // Verify the setting has a description
      TestValidator.predicate(
        `${expectedKey} should have a description`,
        rateLimitSetting.description !== undefined &&
          rateLimitSetting.description !== null &&
          rateLimitSetting.description.length > 0,
      );

      // Verify the value_type is appropriate for rate limits (typically 'int')
      TestValidator.predicate(
        `${expectedKey} should have numeric value_type`,
        rateLimitSetting.value_type === "int" ||
          rateLimitSetting.value_type === "double",
      );

      // Verify the setting has a value
      TestValidator.predicate(
        `${expectedKey} should have a value`,
        rateLimitSetting.value !== undefined &&
          rateLimitSetting.value !== null &&
          rateLimitSetting.value.length > 0,
      );
    }
  }

  // Verify at least some rate limiting settings are present
  const rateLimitSettingsFound = settingsResponse.settings.filter((setting) =>
    rateLimitKeys.includes(setting.key),
  );

  TestValidator.predicate(
    "at least one rate limiting setting should be present",
    rateLimitSettingsFound.length > 0,
  );
}
