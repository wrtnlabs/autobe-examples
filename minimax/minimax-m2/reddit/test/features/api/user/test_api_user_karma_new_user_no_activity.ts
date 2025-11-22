import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserKarma";

export async function test_api_user_karma_new_user_no_activity(
  connection: api.IConnection,
) {
  /**
   * Test karma retrieval for newly registered user with no activity.
   *
   * This test validates that the system correctly handles users with no posts
   * or comments and displays appropriate zero values for all karma metrics. The
   * test verifies the GET /users/{userId}/karma endpoint functionality and
   * ensures proper response structure for inactive users.
   *
   * Test Process:
   *
   * 1. Generate a valid user ID for testing
   * 2. Call the karma retrieval API endpoint
   * 3. Validate response structure matches IRedditPlatformUserKarma.ISummary
   * 4. Verify all karma values (postKarma, commentKarma, totalKarma) are zero
   * 5. Ensure proper timestamp and user context information
   */

  // Generate a valid UUID for the test user
  const userId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve karma information for the new user with no activity
  const karmaInfo: IRedditPlatformUserKarma.ISummary =
    await api.functional.users.karma.at(connection, {
      userId: userId,
    });

  // Validate response structure and type safety
  typia.assert(karmaInfo);

  // Verify zero karma values for user with no activity
  TestValidator.equals("post karma should be zero", karmaInfo.postKarma, 0);
  TestValidator.equals(
    "comment karma should be zero",
    karmaInfo.commentKarma,
    0,
  );
  TestValidator.equals("total karma should be zero", karmaInfo.totalKarma, 0);

  // Validate calculated timestamp exists and is valid
  TestValidator.predicate(
    "calculated timestamp should exist",
    karmaInfo.calculatedAt !== null && karmaInfo.calculatedAt !== undefined,
  );

  // Verify user context information is present
  TestValidator.predicate(
    "user information should exist",
    karmaInfo.user !== null && karmaInfo.user !== undefined,
  );
  TestValidator.equals(
    "user ID should match request",
    karmaInfo.user.id,
    userId,
  );

  // Ensure community context is null (overall platform karma, not community-specific)
  TestValidator.equals(
    "community should be null for overall karma",
    karmaInfo.community,
    null,
  );
}
