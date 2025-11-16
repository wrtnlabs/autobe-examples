import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModeratorKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorKarma";

/**
 * Test retrieving karma statistics for a newly created moderator with zero
 * content contributions.
 *
 * This test validates the zero-state karma scenario where a moderator account
 * has just been created and has not yet made any posts or comments. The
 * endpoint should return zero values for all karma metrics (post_karma,
 * comment_karma, total_karma), demonstrating proper handling of the initial
 * state and preventing null/undefined errors in karma calculations.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account via registration endpoint
 * 2. Retrieve karma statistics for the newly created moderator using their
 *    username
 * 3. Validate that all karma values are zero (post_karma = 0, comment_karma = 0,
 *    total_karma = 0)
 * 4. Verify the response structure matches the expected schema
 */
export async function test_api_moderator_karma_zero_state(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const newModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(newModerator);

  // Step 2: Retrieve karma statistics for the newly created moderator
  const karmaStats: IRedditCommunityModeratorKarma =
    await api.functional.redditCommunity.moderators.karma.at(connection, {
      username: newModerator.username,
    });
  typia.assert(karmaStats);

  // Step 3: Validate that all karma values are zero
  TestValidator.equals("post_karma should be zero", karmaStats.post_karma, 0);
  TestValidator.equals(
    "comment_karma should be zero",
    karmaStats.comment_karma,
    0,
  );
  TestValidator.equals("total_karma should be zero", karmaStats.total_karma, 0);
}
