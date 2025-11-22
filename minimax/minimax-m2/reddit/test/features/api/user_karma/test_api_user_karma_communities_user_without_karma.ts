import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserKarma";

export async function test_api_user_karma_communities_user_without_karma(
  connection: api.IConnection,
) {
  // Generate a random user ID to simulate a new/inactive user
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Call the karma communities breakdown endpoint for a user without community participation
  const karmaBreakdown: IRedditPlatformUserKarma.ISummary =
    await api.functional.redditPlatform.users.karma.communities.at(connection, {
      userId: userId,
    });

  // Validate the response structure and zero karma handling
  typia.assert(karmaBreakdown);

  // Verify the user ID matches what was requested
  TestValidator.equals(
    "user ID matches requested user",
    karmaBreakdown.user.id,
    userId,
  );

  // Verify the user has zero karma across all metrics (typical for new/inactive user)
  TestValidator.equals(
    "total karma should be zero",
    karmaBreakdown.totalKarma,
    0,
  );

  TestValidator.equals(
    "post karma should be zero",
    karmaBreakdown.postKarma,
    0,
  );

  TestValidator.equals(
    "comment karma should be zero",
    karmaBreakdown.commentKarma,
    0,
  );

  // Verify the user object contains the expected user information
  TestValidator.predicate(
    "user object should exist",
    karmaBreakdown.user !== null && karmaBreakdown.user !== undefined,
  );

  TestValidator.predicate(
    "community object should be undefined for new user",
    karmaBreakdown.community === null || karmaBreakdown.community === undefined,
  );

  // Verify calculated timestamp exists (indicating system processed the request)
  TestValidator.predicate(
    "calculated timestamp should exist",
    karmaBreakdown.calculatedAt !== null &&
      karmaBreakdown.calculatedAt !== undefined,
  );

  // Verify timestamp is a valid ISO date-time format
  TestValidator.predicate(
    "calculated timestamp should be valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(karmaBreakdown.calculatedAt),
  );

  // Validate that the response handles the edge case gracefully without errors
  TestValidator.predicate(
    "response should handle zero karma user gracefully",
    karmaBreakdown.totalKarma === 0 &&
      karmaBreakdown.postKarma === 0 &&
      karmaBreakdown.commentKarma === 0,
  );

  // Ensure the user summary contains essential information even for inactive user
  TestValidator.predicate(
    "user summary should contain basic user information",
    karmaBreakdown.user.username !== null &&
      karmaBreakdown.user.username !== undefined &&
      karmaBreakdown.user.account_created !== null &&
      karmaBreakdown.user.account_created !== undefined,
  );

  // Verify the user's karma score in their summary is also zero
  TestValidator.equals(
    "user karma score should be zero in summary",
    karmaBreakdown.user.karma_score,
    0,
  );
}
