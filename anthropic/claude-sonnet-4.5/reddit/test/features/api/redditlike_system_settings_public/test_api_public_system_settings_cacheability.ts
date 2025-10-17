import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test that public system settings endpoint returns data suitable for
 * client-side caching strategies.
 *
 * This test validates that the public system settings endpoint provides
 * consistent, stable configuration data that can be safely cached by client
 * applications. The test retrieves public settings multiple times within a
 * short time window to verify response consistency and data completeness.
 *
 * Steps:
 *
 * 1. Fetch public system settings (first request)
 * 2. Validate the response structure and data completeness
 * 3. Fetch public system settings again (second request)
 * 4. Verify response consistency between requests
 * 5. Fetch public system settings a third time (third request)
 * 6. Confirm all responses are identical, demonstrating cacheability
 */
export async function test_api_public_system_settings_cacheability(
  connection: api.IConnection,
) {
  // Step 1: Fetch public system settings (first request)
  const firstResponse: IRedditLikeSystemSetting.IPublic =
    await api.functional.redditLike.system.settings._public.index(connection);
  typia.assert(firstResponse);

  // Step 2: Validate the response structure and data completeness
  TestValidator.predicate(
    "setting key should be populated",
    firstResponse.key.length > 0,
  );
  TestValidator.predicate(
    "setting value should be populated",
    firstResponse.value.length > 0,
  );
  TestValidator.predicate(
    "value_type should be populated",
    firstResponse.value_type.length > 0,
  );

  // Step 3: Fetch public system settings again (second request)
  const secondResponse: IRedditLikeSystemSetting.IPublic =
    await api.functional.redditLike.system.settings._public.index(connection);
  typia.assert(secondResponse);

  // Step 4: Verify response consistency between first and second requests
  TestValidator.equals(
    "first and second responses should be identical",
    firstResponse,
    secondResponse,
  );

  // Step 5: Fetch public system settings a third time (third request)
  const thirdResponse: IRedditLikeSystemSetting.IPublic =
    await api.functional.redditLike.system.settings._public.index(connection);
  typia.assert(thirdResponse);

  // Step 6: Confirm all responses are identical, demonstrating cacheability
  TestValidator.equals(
    "second and third responses should be identical",
    secondResponse,
    thirdResponse,
  );
  TestValidator.equals(
    "first and third responses should be identical",
    firstResponse,
    thirdResponse,
  );
}
