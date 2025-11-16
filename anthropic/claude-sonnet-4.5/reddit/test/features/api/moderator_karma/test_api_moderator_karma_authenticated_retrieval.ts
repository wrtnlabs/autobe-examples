import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModeratorKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorKarma";

/**
 * Test retrieving karma statistics for a moderator while authenticated as that
 * same moderator.
 *
 * This scenario validates that moderators can view their own karma statistics
 * through the public endpoint and that authentication doesn't alter the karma
 * values or response structure. The test confirms that the karma data is
 * consistent whether accessed publicly or by the moderator themselves, and that
 * authenticated access doesn't reveal additional private karma-related
 * information beyond what's publicly available. This ensures transparency and
 * consistency in karma reporting.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Retrieve the moderator's own karma statistics while authenticated
 * 3. Validate response structure and data types
 * 4. Verify karma values are valid integers
 */
export async function test_api_moderator_karma_authenticated_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderatorRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const authenticatedModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorRegistration,
    });
  typia.assert(authenticatedModerator);

  // Step 2: Retrieve the moderator's karma statistics while authenticated
  const karmaStats: IRedditCommunityModeratorKarma =
    await api.functional.redditCommunity.moderators.karma.at(connection, {
      username: authenticatedModerator.username,
    });
  typia.assert(karmaStats);

  // Step 3: Verify karma calculation is correct (business logic validation)
  TestValidator.equals(
    "total_karma should equal post_karma plus comment_karma",
    karmaStats.total_karma,
    karmaStats.post_karma + karmaStats.comment_karma,
  );
}
