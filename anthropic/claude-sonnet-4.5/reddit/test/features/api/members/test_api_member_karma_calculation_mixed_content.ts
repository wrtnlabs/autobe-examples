import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityMemberKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberKarma";

/**
 * Test karma retrieval for a Reddit community member.
 *
 * Since the available API functions only include karma retrieval and do not
 * provide member creation, post creation, comment creation, or voting
 * functionality, this test validates the karma API endpoint structure and
 * response format rather than the full karma calculation workflow.
 *
 * The test verifies:
 *
 * 1. Karma data can be retrieved for a given username
 * 2. The response contains all required karma fields (total_karma, post_karma,
 *    comment_karma)
 * 3. The response structure matches the expected IRedditCommunityMemberKarma type
 * 4. The mathematical relationship total_karma = post_karma + comment_karma holds
 */
export async function test_api_member_karma_calculation_mixed_content(
  connection: api.IConnection,
) {
  const testUsername = RandomGenerator.alphaNumeric(12);

  const karma: IRedditCommunityMemberKarma =
    await api.functional.redditCommunity.members.karma(connection, {
      username: testUsername,
    });

  typia.assert(karma);

  TestValidator.predicate(
    "total_karma should equal sum of post_karma and comment_karma",
    karma.total_karma === karma.post_karma + karma.comment_karma,
  );
}
