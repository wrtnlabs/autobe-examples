import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformKarmaStats } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaStats";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that an authenticated user can retrieve their own up-to-date karma
 * statistics after joining, and that the response contains all aggregate
 * fields: total_karma, post_karma, comment_karma, lifetime_karma,
 * maximum_karma. Also verifies that access to other users' karma stats is not
 * permitted unless authorized.
 *
 * Workflow:
 *
 * 1. Register a new user via /auth/user/join to get userId and authentication.
 * 2. Retrieve own karma stats by calling
 *    /communityPlatform/user/karmaStats/{userId} with self userId.
 * 3. Verify returned karma stats structure and that userId matches.
 * 4. Attempt to access a different (random) userId's karma stats and expect an
 *    error.
 */
export async function test_api_user_karma_stats_retrieval_by_self(
  connection: api.IConnection,
) {
  // Step 1: Register a new user and obtain authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://test.example.com/register",
    referrer: "https://test.example.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(user);
  TestValidator.equals(
    "joined user's email matches request",
    user.email,
    joinBody.email,
  );
  TestValidator.equals(
    "joined user's display_name matches request",
    user.display_name,
    joinBody.display_name,
  );

  // Step 2: Retrieve the user's own karma stats
  const stats: ICommunityPlatformKarmaStats =
    await api.functional.communityPlatform.user.karmaStats.at(connection, {
      userId: user.id,
    });
  typia.assert(stats);
  TestValidator.equals(
    "karma stats record belongs to joined user",
    stats.community_platform_user_id,
    user.id,
  );
  TestValidator.predicate(
    "karma stats contain total_karma as int32",
    typeof stats.total_karma === "number" &&
      Number.isInteger(stats.total_karma),
  );
  TestValidator.predicate(
    "karma stats contain post_karma as int32",
    typeof stats.post_karma === "number" && Number.isInteger(stats.post_karma),
  );
  TestValidator.predicate(
    "karma stats contain comment_karma as int32",
    typeof stats.comment_karma === "number" &&
      Number.isInteger(stats.comment_karma),
  );
  TestValidator.predicate(
    "karma stats contain lifetime_karma as int32",
    typeof stats.lifetime_karma === "number" &&
      Number.isInteger(stats.lifetime_karma),
  );
  TestValidator.predicate(
    "karma stats contain maximum_karma as int32",
    typeof stats.maximum_karma === "number" &&
      Number.isInteger(stats.maximum_karma),
  );

  // Step 3: Attempt to access a different user's karma stats (should error)
  const otherUserId = typia.random<string & tags.Format<"uuid">>();
  if (otherUserId !== user.id) {
    await TestValidator.error(
      "should not allow retrieval of other user's karma stats",
      async () => {
        await api.functional.communityPlatform.user.karmaStats.at(connection, {
          userId: otherUserId,
        });
      },
    );
  }
}
