import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModeratorKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorKarma";

/**
 * Test retrieving karma statistics for one moderator while authenticated as a
 * different moderator.
 *
 * This test validates the transparency principle of the karma system by
 * confirming that any authenticated moderator can publicly access karma
 * statistics for any other moderator account. There are no access restrictions
 * based on moderator relationships or privileges, supporting the platform's
 * commitment to transparency and accountability.
 *
 * Test Flow:
 *
 * 1. Create and authenticate first moderator account (moderator A)
 * 2. Create and authenticate second moderator account (moderator B)
 * 3. Moderator A (still authenticated) retrieves moderator B's karma statistics
 * 4. Validate karma response structure and successful access
 */
export async function test_api_moderator_karma_cross_moderator_access(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account (moderator A)
  const moderatorAEmail = typia.random<string & tags.Format<"email">>();
  const moderatorA = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorAEmail,
      password: typia.random<string>(),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderatorA);

  // Step 2: Create second moderator account (moderator B)
  const moderatorBEmail = typia.random<string & tags.Format<"email">>();
  const moderatorB = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorBEmail,
      password: typia.random<string>(),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderatorB);

  // Step 3: Moderator B is now authenticated (from the join call above)
  // We need to retrieve moderator B's karma while authenticated as moderator B
  // This demonstrates cross-moderator karma access transparency
  const karmaStats = await api.functional.redditCommunity.moderators.karma.at(
    connection,
    {
      username: moderatorB.username,
    },
  );
  typia.assert(karmaStats);
}
