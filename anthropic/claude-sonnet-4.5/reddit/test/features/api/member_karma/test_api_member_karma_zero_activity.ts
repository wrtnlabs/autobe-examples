import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityMemberKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberKarma";

/**
 * Test karma retrieval for a new member with no activity.
 *
 * This test validates that the karma statistics API correctly handles members
 * who have not yet created any posts or comments. It ensures that all karma
 * values (total_karma, post_karma, and comment_karma) are properly initialized
 * to zero, representing the initial state before any community contributions.
 *
 * Test workflow:
 *
 * 1. Generate a unique username for a new member
 * 2. Retrieve karma statistics for this member
 * 3. Validate response structure and type correctness
 * 4. Verify all karma values are zero
 * 5. Confirm the mathematical relationship holds: total_karma = post_karma +
 *    comment_karma
 */
export async function test_api_member_karma_zero_activity(
  connection: api.IConnection,
) {
  // Generate a unique username for a new member with no activity
  const username = RandomGenerator.alphaNumeric(12);

  // Retrieve karma statistics for the new member
  const karma: IRedditCommunityMemberKarma =
    await api.functional.redditCommunity.members.karma(connection, {
      username,
    });

  // Validate response structure and type correctness
  typia.assert(karma);

  // Verify that total_karma is zero for a member with no activity
  TestValidator.equals(
    "total karma should be zero for new member",
    karma.total_karma,
    0,
  );

  // Verify that post_karma is zero (no posts created)
  TestValidator.equals(
    "post karma should be zero with no posts",
    karma.post_karma,
    0,
  );

  // Verify that comment_karma is zero (no comments created)
  TestValidator.equals(
    "comment karma should be zero with no comments",
    karma.comment_karma,
    0,
  );

  // Verify the mathematical relationship: total_karma = post_karma + comment_karma
  TestValidator.equals(
    "total karma equals sum of post and comment karma",
    karma.total_karma,
    karma.post_karma + karma.comment_karma,
  );
}
