import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test retrieval of public system settings for content limits.
 *
 * This test validates that the platform correctly exposes public system
 * settings that inform client applications about content constraints and
 * platform limits. It retrieves all public settings and verifies the presence
 * and correctness of key content-related configuration parameters.
 *
 * The test performs the following steps:
 *
 * 1. Call the public system settings endpoint without authentication
 * 2. Validate the response structure contains a settings array
 * 3. Verify presence of critical content limit settings
 * 4. Check that each setting has proper value_type indicators
 * 5. Validate that settings include descriptive information
 * 6. Ensure settings are properly categorized for organization
 */
export async function test_api_system_settings_content_limits_retrieval(
  connection: api.IConnection,
) {
  // Retrieve public system settings
  const response: IRedditLikeSystemSetting.IPublicList =
    await api.functional.redditLike.system.settings.index(connection);

  // Validate response structure
  typia.assert(response);

  // Verify settings array exists and contains data
  TestValidator.predicate(
    "settings array should exist and contain entries",
    Array.isArray(response.settings) && response.settings.length > 0,
  );

  // Create a map for easier lookup of settings by key
  const settingsMap = new Map<string, IRedditLikeSystemSetting>();
  response.settings.forEach((setting) => {
    settingsMap.set(setting.key, setting);
  });

  // Define expected content-related setting keys to verify
  const expectedContentSettings = [
    "max_post_length",
    "max_comment_length",
    "max_image_file_size",
  ];

  // Check for presence of key content settings (at least some should exist)
  const foundContentSettings = expectedContentSettings.filter((key) =>
    settingsMap.has(key),
  );

  TestValidator.predicate(
    "at least some content limit settings should be present",
    foundContentSettings.length > 0,
  );

  // Validate each found content setting
  foundContentSettings.forEach((key) => {
    const setting = settingsMap.get(key);
    if (setting) {
      // Verify the setting is marked as public
      TestValidator.equals(
        `${key} should be publicly visible`,
        setting.is_public,
        true,
      );

      // Verify value_type is appropriate (primarily numeric for content limits)
      const validValueTypes = ["int", "double", "string", "boolean"];
      TestValidator.predicate(
        `${key} should have valid value_type`,
        validValueTypes.includes(setting.value_type),
      );

      // Verify the setting has a non-empty value
      TestValidator.predicate(
        `${key} should have a value`,
        setting.value.length > 0,
      );

      // Verify setting has required metadata fields
      TestValidator.predicate(
        `${key} should have an id`,
        setting.id.length > 0,
      );

      TestValidator.predicate(
        `${key} should have timestamps`,
        setting.created_at.length > 0 && setting.updated_at.length > 0,
      );
    }
  });

  // Validate that all returned settings are marked as public
  response.settings.forEach((setting) => {
    TestValidator.equals(
      `setting ${setting.key} should be public`,
      setting.is_public,
      true,
    );
  });

  // Verify that settings have proper categorization (if category exists)
  const categorizedSettings = response.settings.filter(
    (s) => s.category !== undefined,
  );

  if (categorizedSettings.length > 0) {
    TestValidator.predicate(
      "categorized settings should have non-empty category values",
      categorizedSettings.every((s) => s.category && s.category.length > 0),
    );
  }
}
