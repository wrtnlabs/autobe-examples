import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test that unauthenticated guest users can successfully retrieve public
 * platform-wide configuration settings.
 *
 * This validates the transparency principle that operational parameters are
 * visible to all users without authentication. The test verifies that the
 * public settings endpoint is accessible without authentication and returns
 * valid system setting data.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection (guest user)
 * 2. Call the public settings API endpoint
 * 3. Validate the response structure matches IRedditLikeSystemSetting.IPublic
 */
export async function test_api_public_system_settings_guest_access(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection (guest user)
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Retrieve public system settings without authentication
  const publicSetting: IRedditLikeSystemSetting.IPublic =
    await api.functional.redditLike.system.settings._public.index(
      guestConnection,
    );

  // Validate the response structure and data types
  typia.assert(publicSetting);
}
