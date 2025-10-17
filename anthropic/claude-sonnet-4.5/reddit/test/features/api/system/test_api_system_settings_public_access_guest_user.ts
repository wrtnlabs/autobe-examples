import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test that unauthenticated guest users can retrieve public platform-wide
 * configuration settings.
 *
 * This test validates the transparency principle that platform operational
 * parameters should be visible to all users without requiring authentication.
 * Guest users need to understand platform constraints like maximum post length
 * and rate limiting thresholds before registering.
 *
 * Test Flow:
 *
 * 1. Call system settings API without authentication (as guest user)
 * 2. Verify response contains settings array with public settings
 * 3. Validate all returned settings have is_public=true (no internal settings
 *    exposed)
 * 4. Confirm each setting contains proper metadata structure
 * 5. Ensure response structure enables clients to understand platform capabilities
 */
export async function test_api_system_settings_public_access_guest_user(
  connection: api.IConnection,
) {
  // Retrieve system settings without authentication (as guest user)
  const response: IRedditLikeSystemSetting.IPublicList =
    await api.functional.redditLike.system.settings.index(connection);

  // Validate the complete response structure and all type requirements
  typia.assert(response);

  // Verify at least some public settings are returned
  TestValidator.predicate(
    "settings array should contain public settings",
    response.settings.length > 0,
  );

  // Validate business logic: all returned settings must be public
  for (const setting of response.settings) {
    // Critical business rule: only public settings should be exposed to guest users
    TestValidator.predicate(
      `setting ${setting.key} must be public (is_public=true)`,
      setting.is_public === true,
    );

    // Validate value_type is one of the expected platform types
    TestValidator.predicate(
      `setting ${setting.key} must have valid value_type`,
      ["string", "int", "double", "boolean", "json"].includes(
        setting.value_type,
      ),
    );
  }
}
