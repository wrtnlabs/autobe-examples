import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityMemberKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberKarma";

/**
 * Test karma aggregation across multiple communities.
 *
 * Validates that the karma retrieval endpoint returns properly structured karma
 * statistics that represent platform-wide aggregation. The karma system is
 * designed to sum all votes (upvotes - downvotes) across all communities where
 * a member has contributed posts and comments.
 *
 * This test verifies:
 *
 * 1. The karma endpoint returns valid response structure
 * 2. The mathematical relationship total_karma = post_karma + comment_karma holds
 * 3. All karma values are valid int32 integers (validated by typia.assert)
 * 4. The endpoint is publicly accessible (no authentication required)
 *
 * Note: Due to API limitations (no endpoints for creating posts, comments,
 * votes, or communities), this test focuses on validating the endpoint's
 * response structure and karma calculation logic rather than setting up a
 * multi-community scenario.
 */
export async function test_api_member_karma_across_multiple_communities(
  connection: api.IConnection,
) {
  // Generate a random username for testing
  const testUsername = RandomGenerator.name(1);

  // Retrieve karma statistics for the member
  const karma = await api.functional.redditCommunity.members.karma(connection, {
    username: testUsername,
  });

  // Validate response structure matches expected type (includes all int32 validation)
  typia.assert(karma);

  // Verify the fundamental karma calculation rule: total = post + comment
  TestValidator.equals(
    "total karma equals sum of post karma and comment karma",
    karma.total_karma,
    karma.post_karma + karma.comment_karma,
  );
}
