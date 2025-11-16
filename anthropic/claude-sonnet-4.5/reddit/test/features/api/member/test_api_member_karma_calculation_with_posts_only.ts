import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityMemberKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberKarma";

/**
 * Test karma retrieval API response structure and validation.
 *
 * **SCENARIO LIMITATION**: The original scenario requested testing karma
 * calculation for a member with posts only. However, the provided API materials
 * only include the karma retrieval endpoint. The following required APIs are
 * NOT available:
 *
 * - Member creation/registration
 * - Post creation
 * - Vote submission (upvotes/downvotes)
 *
 * Therefore, this test has been simplified to validate:
 *
 * 1. The karma API response structure is correct
 * 2. Type validation passes for all karma fields
 * 3. The mathematical relationship total_karma = post_karma + comment_karma holds
 * 4. All karma values are valid integers
 *
 * This test uses a sample username and validates the API's response format,
 * which is the maximum testing possible with the available API operations.
 */
export async function test_api_member_karma_calculation_with_posts_only(
  connection: api.IConnection,
) {
  const sampleUsername = RandomGenerator.alphaNumeric(10);

  const karma: IRedditCommunityMemberKarma =
    await api.functional.redditCommunity.members.karma(connection, {
      username: sampleUsername,
    });
  typia.assert(karma);

  TestValidator.predicate(
    "total_karma is valid int32",
    Number.isInteger(karma.total_karma),
  );

  TestValidator.predicate(
    "post_karma is valid int32",
    Number.isInteger(karma.post_karma),
  );

  TestValidator.predicate(
    "comment_karma is valid int32",
    Number.isInteger(karma.comment_karma),
  );

  TestValidator.equals(
    "total_karma equals sum of post_karma and comment_karma",
    karma.total_karma,
    karma.post_karma + karma.comment_karma,
  );
}
