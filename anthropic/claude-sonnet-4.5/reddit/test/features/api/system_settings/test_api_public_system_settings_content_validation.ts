import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test that the public system settings response contains expected content
 * validation parameters.
 *
 * This test validates the structure and completeness of public system settings
 * returned by the API. It retrieves a public system setting and verifies that
 * it contains the required fields (key, value, value_type) that clients need
 * for proper configuration reference and type handling.
 *
 * The test ensures:
 *
 * 1. The API returns a valid public system setting object
 * 2. The setting contains all required fields with proper types
 * 3. The response structure is complete and usable for client applications
 * 4. The setting provides meaningful configuration data (non-empty key and
 *    value_type)
 */
export async function test_api_public_system_settings_content_validation(
  connection: api.IConnection,
) {
  const publicSetting: IRedditLikeSystemSetting.IPublic =
    await api.functional.redditLike.system.settings._public.index(connection);

  typia.assert(publicSetting);

  TestValidator.predicate(
    "setting key is non-empty",
    publicSetting.key.length > 0,
  );

  TestValidator.predicate(
    "setting value_type is non-empty",
    publicSetting.value_type.length > 0,
  );
}
