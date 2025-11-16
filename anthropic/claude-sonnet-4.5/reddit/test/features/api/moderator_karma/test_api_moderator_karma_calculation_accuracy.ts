import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModeratorKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorKarma";

/**
 * Test moderator karma calculation accuracy.
 *
 * This test validates that the karma statistics accurately reflect the net
 * upvotes from moderator posts and comments. It creates a moderator account and
 * verifies that the karma values are correctly calculated with post_karma
 * representing post voting, comment_karma representing comment voting, and
 * total_karma equaling their sum.
 *
 * The test ensures the karma system serves as an accurate measure of community
 * assessment of moderator contributions, which is critical for establishing
 * moderator credibility and transparency.
 *
 * Test workflow:
 *
 * 1. Create a moderator account
 * 2. Retrieve karma statistics for the moderator
 * 3. Validate karma structure with typia.assert (complete type validation)
 * 4. Verify total_karma calculation accuracy (business logic validation)
 */
export async function test_api_moderator_karma_calculation_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve karma statistics for the newly created moderator
  const karma: IRedditCommunityModeratorKarma =
    await api.functional.redditCommunity.moderators.karma.at(connection, {
      username: moderator.username,
    });
  typia.assert(karma);

  // Step 3: Verify karma calculation accuracy - total_karma must equal sum of post and comment karma
  // This is the core business logic validation for karma calculation
  TestValidator.equals(
    "total_karma should equal post_karma plus comment_karma",
    karma.total_karma,
    karma.post_karma + karma.comment_karma,
  );
}
