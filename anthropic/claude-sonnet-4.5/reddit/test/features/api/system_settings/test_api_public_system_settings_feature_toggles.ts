import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test that public system settings include feature availability flags that
 * clients use to conditionally enable or disable functionality.
 *
 * This test validates that the public system settings endpoint returns feature
 * toggle configuration that allows clients to dynamically adjust their UI and
 * behavior based on platform capabilities.
 *
 * Steps:
 *
 * 1. Retrieve public system settings from the API
 * 2. Validate the response structure and type safety
 * 3. Identify feature toggle settings (those with value_type set to 'boolean')
 * 4. Verify feature toggles have descriptive documentation
 * 5. Confirm clients can use these toggles for feature flag-driven development
 */
export async function test_api_public_system_settings_feature_toggles(
  connection: api.IConnection,
) {
  const settings: IRedditLikeSystemSetting.IPublic =
    await api.functional.redditLike.system.settings._public.index(connection);

  typia.assert(settings);

  TestValidator.predicate(
    "settings object should have required properties",
    settings !== null && typeof settings === "object",
  );

  TestValidator.predicate(
    "settings should have a key property",
    typeof settings.key === "string" && settings.key.length > 0,
  );

  TestValidator.predicate(
    "settings should have a value property",
    typeof settings.value === "string",
  );

  TestValidator.predicate(
    "settings should have a value_type property",
    typeof settings.value_type === "string" && settings.value_type.length > 0,
  );

  if (settings.value_type === "boolean") {
    TestValidator.predicate(
      "boolean feature toggle should have valid boolean value representation",
      settings.value === "true" || settings.value === "false",
    );

    if (settings.description !== undefined) {
      TestValidator.predicate(
        "feature toggle description should clearly explain functionality",
        typeof settings.description === "string" &&
          settings.description.length > 0,
      );
    }
  }

  if (settings.category !== undefined) {
    TestValidator.predicate(
      "category should be a non-empty string when provided",
      typeof settings.category === "string" && settings.category.length > 0,
    );
  }
}
