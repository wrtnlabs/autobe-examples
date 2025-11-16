import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformProfileDisplayMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileDisplayMetrics";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that an authenticated user can fetch or refresh their own profile
 * display metrics snapshot using the PATCH endpoint.
 *
 * Test Steps:
 *
 * 1. Register a new user using a unique email and password.
 * 2. Call the PATCH /communityPlatform/user/users/{userId}/profileDisplayMetrics
 *    operation with the authenticated user's id.
 * 3. Validate that all required fields in ICommunityPlatformProfileDisplayMetrics
 *    are present and have correct types.
 * 4. Ensure the metrics are returned for the authenticated user only.
 * 5. Confirm plausible metric state: profile_view_count and impression_count are
 *
 * > = 0.
 */
export async function test_api_profile_metrics_patch_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 2. Fetch profile display metrics for the authenticated user
  const metrics: ICommunityPlatformProfileDisplayMetrics =
    await api.functional.communityPlatform.user.users.profileDisplayMetrics.index(
      connection,
      {
        userId: user.id,
        body: {},
      },
    );
  typia.assert(metrics);

  // 3. Validate that the fetched metrics belong to the authenticated user
  TestValidator.equals(
    "metrics community_platform_user_id matches user id",
    metrics.community_platform_user_id,
    user.id,
  );
  // 4. Confirm plausible state for the new user's metrics
  TestValidator.predicate(
    "metrics profile_view_count >= 0",
    metrics.profile_view_count >= 0,
  );
  TestValidator.predicate(
    "metrics impression_count >= 0",
    metrics.impression_count >= 0,
  );
}
