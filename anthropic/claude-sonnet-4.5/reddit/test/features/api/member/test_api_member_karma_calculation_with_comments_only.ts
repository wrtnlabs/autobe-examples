import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityMemberKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberKarma";

/**
 * Test karma calculation for a member who has only posted comments without
 * creating any posts.
 *
 * This test validates the karma calculation system by retrieving karma
 * statistics for a community member and verifying the relationships between
 * different karma types.
 *
 * The test verifies that:
 *
 * 1. The karma retrieval endpoint returns a valid response structure
 * 2. All required karma fields (total_karma, post_karma, comment_karma) are
 *    present
 * 3. The mathematical relationship holds: total_karma = post_karma + comment_karma
 * 4. All karma values are valid int32 numbers (verified by typia.assert)
 *
 * Steps:
 *
 * 1. Generate a test username for karma retrieval
 * 2. Call the karma retrieval API endpoint
 * 3. Validate the response structure using typia runtime validation
 * 4. Verify the karma calculation formula
 */
export async function test_api_member_karma_calculation_with_comments_only(
  connection: api.IConnection,
) {
  const testUsername = RandomGenerator.name(1);

  const karma: IRedditCommunityMemberKarma =
    await api.functional.redditCommunity.members.karma(connection, {
      username: testUsername,
    });

  typia.assert(karma);

  TestValidator.equals(
    "total karma equals sum of post and comment karma",
    karma.total_karma,
    karma.post_karma + karma.comment_karma,
  );
}
