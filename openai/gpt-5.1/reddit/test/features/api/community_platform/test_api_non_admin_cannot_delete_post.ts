import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify that a non-admin actor cannot delete posts via the admin-only delete
 * endpoint.
 *
 * Business intent:
 *
 * - The DELETE /communityPlatform/adminUser/posts/{postId} endpoint is reserved
 *   for `adminUser` actors. Any attempt by a regular member (non-admin) to call
 *   this endpoint must fail with an authorization error.
 * - This test assumes that the provided `connection` is already authenticated as
 *   a non-admin actor (e.g., a memberUser), prepared by outer test harness
 *   orchestration.
 *
 * What this test validates:
 *
 * 1. A non-admin connection calling the admin-only posts.erase() SDK method
 *    results in an error (e.g., HttpError from @nestia/fetcher).
 * 2. The test does not assert the exact HTTP status code or error payload; it only
 *    asserts that the call fails, which is sufficient to prove that non-admin
 *    callers cannot successfully invoke this admin endpoint.
 * 3. Since there is no public GET-by-id endpoint for posts in the available SDK
 *    list, the test does not attempt to verify post persistence; authorization
 *    failure itself is the subject of this scenario.
 *
 * Implementation outline:
 *
 * - Generate a random string as `postId` using typia.random<string>(). The actual
 *   existence of the target post is irrelevant because authorization must fail
 *   before any deletion logic.
 * - Wrap the erase() call inside TestValidator.error with an async closure to
 *   assert that an error is thrown for the non-admin connection.
 * - Use a descriptive TestValidator.error title so that failures are easy to
 *   diagnose in test logs.
 */
export async function test_api_non_admin_cannot_delete_post(
  connection: api.IConnection,
) {
  // Prepare a random post identifier; actual existence is not relevant for this test.
  const targetPostId: string = typia.random<string>();

  // Expect the admin-only delete endpoint to reject this non-admin connection.
  await TestValidator.error(
    "non-admin cannot call admin-only posts.erase",
    async () => {
      await api.functional.communityPlatform.adminUser.posts.erase(connection, {
        postId: targetPostId,
      });
    },
  );
}
