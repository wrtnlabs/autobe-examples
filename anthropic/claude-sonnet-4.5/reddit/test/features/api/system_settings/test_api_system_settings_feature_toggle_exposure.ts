import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test feature toggle exposure through public system settings.
 *
 * This test validates that platform feature availability toggles are properly
 * exposed through the public system settings API. It retrieves all public
 * system settings and verifies that feature flags exist with appropriate
 * metadata including value types, descriptions, and categorization.
 *
 * The test ensures that:
 *
 * 1. System settings can be retrieved without authentication
 * 2. Feature toggle settings have value_type 'boolean'
 * 3. Boolean values are properly formatted as strings
 * 4. Settings include descriptions and categorization when present
 * 5. Settings are properly organized into logical categories
 *
 * This validation is critical for client applications to dynamically adapt
 * their UI based on current platform capabilities without hardcoding feature
 * assumptions.
 */
export async function test_api_system_settings_feature_toggle_exposure(
  connection: api.IConnection,
) {
  // Retrieve public system settings without authentication
  const response: IRedditLikeSystemSetting.IPublicList =
    await api.functional.redditLike.system.settings.index(connection);
  typia.assert(response);

  // Validate settings exist
  TestValidator.predicate(
    "settings array is not empty",
    response.settings.length > 0,
  );

  // Validate all settings are marked as public
  for (const setting of response.settings) {
    TestValidator.equals(
      "setting is marked as public",
      setting.is_public,
      true,
    );
  }

  // Find boolean feature toggles
  const booleanSettings = response.settings.filter(
    (s) => s.value_type === "boolean",
  );

  TestValidator.predicate(
    "at least one boolean feature toggle exists",
    booleanSettings.length > 0,
  );

  // Validate boolean feature toggles
  for (const toggle of booleanSettings) {
    TestValidator.equals(
      "boolean toggle has correct value_type",
      toggle.value_type,
      "boolean",
    );

    // Boolean values should be "true" or "false" as strings
    TestValidator.predicate(
      "boolean toggle value is valid",
      toggle.value === "true" || toggle.value === "false",
    );

    // Description should be present and meaningful for feature toggles
    if (toggle.description !== undefined) {
      TestValidator.predicate(
        "boolean toggle description is not empty",
        toggle.description.length > 0,
      );
    }

    // Category helps organize settings logically
    if (toggle.category !== undefined) {
      TestValidator.predicate(
        "boolean toggle category is not empty",
        toggle.category.length > 0,
      );
    }
  }

  // Validate settings with categories are properly grouped
  const categorizedSettings = response.settings.filter(
    (s) => s.category !== undefined,
  );

  if (categorizedSettings.length > 0) {
    const categories = new Set(categorizedSettings.map((s) => s.category));
    TestValidator.predicate(
      "settings are organized into categories",
      categories.size > 0,
    );
  }
}
