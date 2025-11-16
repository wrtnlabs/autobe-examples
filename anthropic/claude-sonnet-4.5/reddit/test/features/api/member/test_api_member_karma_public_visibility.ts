import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityMemberKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberKarma";

/**
 * Test that karma statistics are publicly accessible without authentication.
 *
 * This test validates the fundamental transparency of the karma reputation
 * system by confirming that any user (authenticated or not) can retrieve
 * complete karma statistics for any member. The test creates an unauthenticated
 * connection and retrieves karma data to verify public accessibility.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection (no auth headers)
 * 2. Generate a test username
 * 3. Retrieve karma statistics without authentication
 * 4. Validate the complete karma breakdown is accessible
 * 5. Verify the mathematical integrity (total = post + comment karma)
 */
export async function test_api_member_karma_public_visibility(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Generate a random username for testing
  const testUsername = RandomGenerator.alphaNumeric(12);

  // Retrieve karma statistics without authentication
  const karma: IRedditCommunityMemberKarma =
    await api.functional.redditCommunity.members.karma(unauthConn, {
      username: testUsername,
    });

  // Validate that the response matches the expected type structure
  typia.assert(karma);

  // Verify the mathematical relationship: total_karma = post_karma + comment_karma
  TestValidator.equals(
    "total karma equals sum of post and comment karma",
    karma.total_karma,
    karma.post_karma + karma.comment_karma,
  );
}
