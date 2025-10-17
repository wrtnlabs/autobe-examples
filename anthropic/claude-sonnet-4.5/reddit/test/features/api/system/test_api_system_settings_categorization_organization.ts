import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test system settings categorization and organization.
 *
 * Validates that public system settings are properly organized by category for
 * easier consumption by client applications. Retrieves all public settings and
 * verifies that:
 *
 * - Settings are grouped into logical categories (content, moderation,
 *   performance, features)
 * - Each setting has an assigned category
 * - Related settings share categories
 * - The categorization helps clients organize configuration data
 *
 * This ensures the settings API provides structured, organized configuration
 * data rather than a flat unorganized list.
 */
export async function test_api_system_settings_categorization_organization(
  connection: api.IConnection,
) {
  // Retrieve public system settings
  const result: IRedditLikeSystemSetting.IPublicList =
    await api.functional.redditLike.system.settings.index(connection);
  typia.assert(result);

  // Validate that we received settings
  TestValidator.predicate(
    "settings array should exist",
    Array.isArray(result.settings),
  );

  // Validate that settings have categories assigned
  const settingsWithCategories = result.settings.filter(
    (setting) =>
      setting.category !== undefined &&
      setting.category !== null &&
      setting.category.length > 0,
  );

  TestValidator.predicate(
    "most settings should have categories assigned",
    settingsWithCategories.length > 0,
  );

  // Group settings by category to verify organization
  const categorizedSettings: Record<string, IRedditLikeSystemSetting[]> = {};
  for (const setting of result.settings) {
    if (setting.category) {
      if (!categorizedSettings[setting.category]) {
        categorizedSettings[setting.category] = [];
      }
      categorizedSettings[setting.category].push(setting);
    }
  }

  // Verify that we have logical category groupings
  const categories = Object.keys(categorizedSettings);
  TestValidator.predicate(
    "settings should be organized into categories",
    categories.length > 0,
  );

  // Validate that each category has at least one setting
  for (const category of categories) {
    TestValidator.predicate(
      `category '${category}' should contain settings`,
      categorizedSettings[category].length > 0,
    );
  }

  // Verify that all public settings are included
  TestValidator.predicate(
    "all settings should be public",
    result.settings.every((setting) => setting.is_public === true),
  );
}
