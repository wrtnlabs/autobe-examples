import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPostStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostStatistics";
import type { IDiscussionBoardPostStatusCounts } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostStatusCounts";
import type { IPostStatusPercentages } from "@ORGANIZATION/PROJECT-api/lib/structures/IPostStatusPercentages";

/**
 * Test retrieval of post statistics when the discussion board has no posts.
 *
 * This test validates that the statistics endpoint correctly handles empty
 * datasets by returning zero counts for all post status categories and properly
 * calculating percentage distributions even when there are no posts. The test
 * ensures that the statistical aggregation logic handles edge cases correctly.
 */
export async function test_api_moderator_statistics_posts_by_status_empty_board(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(1),
      password: "securePassword123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      moderation_level: "basic",
      ip: "192.168.1.1",
      href: "https://example.com/dashboard" satisfies string &
        tags.Format<"uri"> as string,
      referrer: "https://example.com" satisfies string &
        tags.Format<"uri"> as string,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Retrieve post statistics without creating any posts
  const statistics =
    await api.functional.discussionBoard.moderator.statistics.postsByStatus.index(
      connection,
    );
  typia.assert(statistics);

  // Step 3: Validate all status counts are zero
  TestValidator.equals(
    "draft posts count should be zero",
    statistics.status_counts.draft,
    0,
  );
  TestValidator.equals(
    "published posts count should be zero",
    statistics.status_counts.published,
    0,
  );
  TestValidator.equals(
    "archived posts count should be zero",
    statistics.status_counts.archived,
    0,
  );
  TestValidator.equals(
    "deleted posts count should be zero",
    statistics.status_counts.deleted,
    0,
  );

  // Step 4: Validate total posts is zero
  TestValidator.equals("total posts should be zero", statistics.total_posts, 0);

  // Step 5: Validate all percentages are correctly calculated as 0%
  TestValidator.equals(
    "draft percentage should be 0",
    statistics.status_percentages.draft_percentage,
    0,
  );
  TestValidator.equals(
    "published percentage should be 0",
    statistics.status_percentages.published_percentage,
    0,
  );
  TestValidator.equals(
    "archived percentage should be 0",
    statistics.status_percentages.archived_percentage,
    0,
  );
  TestValidator.equals(
    "deleted percentage should be 0",
    statistics.status_percentages.deleted_percentage,
    0,
  );

  // Step 6: Validate the complete response structure
  TestValidator.equals(
    "status counts structure should match empty board",
    statistics.status_counts,
    {
      draft: 0,
      published: 0,
      archived: 0,
      deleted: 0,
    } satisfies IDiscussionBoardPostStatusCounts,
  );

  TestValidator.equals(
    "status percentages structure should match empty board",
    statistics.status_percentages,
    {
      draft_percentage: 0,
      published_percentage: 0,
      archived_percentage: 0,
      deleted_percentage: 0,
    } satisfies IPostStatusPercentages,
  );
}
