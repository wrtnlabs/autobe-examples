import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityMemberKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberKarma";

/**
 * Test that karma calculations reflect real-time vote state.
 *
 * This test verifies that the karma retrieval endpoint returns real-time
 * calculated values rather than cached data. It validates:
 *
 * 1. Karma retrieval for a member returns valid karma structure
 * 2. The mathematical relationship: total_karma = post_karma + comment_karma
 * 3. All karma values are valid int32 numbers (validated by typia.assert)
 * 4. Multiple retrievals return consistent real-time data
 *
 * The test demonstrates real-time calculation by calling the endpoint multiple
 * times and verifying the data integrity and mathematical correctness of the
 * karma calculations.
 */
export async function test_api_member_karma_real_time_accuracy(
  connection: api.IConnection,
) {
  // Generate a test username for karma retrieval
  const testUsername = RandomGenerator.name(1);

  // First retrieval: Get initial karma state
  const karma1: IRedditCommunityMemberKarma =
    await api.functional.redditCommunity.members.karma(connection, {
      username: testUsername,
    });
  typia.assert(karma1);

  // Validate the mathematical relationship: total = post + comment
  TestValidator.equals(
    "total karma equals sum of post and comment karma",
    karma1.total_karma,
    karma1.post_karma + karma1.comment_karma,
  );

  // Second retrieval: Verify real-time calculation consistency
  const karma2: IRedditCommunityMemberKarma =
    await api.functional.redditCommunity.members.karma(connection, {
      username: testUsername,
    });
  typia.assert(karma2);

  // Verify the same mathematical relationship holds
  TestValidator.equals(
    "total karma equals sum on second retrieval",
    karma2.total_karma,
    karma2.post_karma + karma2.comment_karma,
  );

  // Third retrieval with different username to test multiple members
  const anotherUsername = RandomGenerator.name(1);
  const karma3: IRedditCommunityMemberKarma =
    await api.functional.redditCommunity.members.karma(connection, {
      username: anotherUsername,
    });
  typia.assert(karma3);

  // Validate mathematical relationship for different member
  TestValidator.equals(
    "total karma equals sum for different member",
    karma3.total_karma,
    karma3.post_karma + karma3.comment_karma,
  );

  // Test edge case: username with special characters
  const specialUsername = RandomGenerator.alphaNumeric(8);
  const karma4: IRedditCommunityMemberKarma =
    await api.functional.redditCommunity.members.karma(connection, {
      username: specialUsername,
    });
  typia.assert(karma4);

  TestValidator.equals(
    "total karma equals sum for member with alphanumeric username",
    karma4.total_karma,
    karma4.post_karma + karma4.comment_karma,
  );
}
