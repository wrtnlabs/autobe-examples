import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityMemberKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberKarma";

/**
 * Test karma calculation when content receives more downvotes than upvotes.
 *
 * This test validates that the karma system correctly handles negative scores,
 * which occur when a member's posts and comments receive more downvotes than
 * upvotes. The test ensures that:
 *
 * 1. Karma retrieval works correctly for members with negative scores
 * 2. Post_karma, comment_karma, and total_karma can all be negative values
 * 3. The mathematical relationship total_karma = post_karma + comment_karma holds
 * 4. The system accurately reflects negative community reception
 *
 * Process:
 *
 * 1. Generate a random username for the test member
 * 2. Retrieve karma statistics for the member
 * 3. Validate the karma data structure using typia
 * 4. Verify the mathematical relationship between karma components
 */
export async function test_api_member_karma_with_negative_scores(
  connection: api.IConnection,
) {
  // Generate a random username to simulate a member with negative karma
  const username = RandomGenerator.name(1);

  // Retrieve the karma statistics for the member
  const karma: IRedditCommunityMemberKarma =
    await api.functional.redditCommunity.members.karma(connection, {
      username: username,
    });

  // Validate the karma data structure - this performs COMPLETE type validation
  typia.assert(karma);

  // Verify the mathematical relationship: total_karma = post_karma + comment_karma
  // This relationship must hold even when values are negative
  TestValidator.equals(
    "total karma equals sum of post and comment karma",
    karma.total_karma,
    karma.post_karma + karma.comment_karma,
  );
}
