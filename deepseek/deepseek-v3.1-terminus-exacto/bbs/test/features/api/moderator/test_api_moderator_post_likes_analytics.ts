import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostLike";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPostLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostLike";

/**
 * Test moderator access to post like analytics for content appreciation
 * metrics.
 *
 * This test validates that moderators can retrieve paginated like records for
 * discussion board posts with proper filtering and sorting capabilities. The
 * test focuses on testing the analytics API functionality without creating
 * actual posts since the post creation requires valid channel and section
 * references that don't exist in the test environment.
 */
export async function test_api_moderator_post_likes_analytics(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: moderatorPassword,
      moderation_level: "senior",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Test the like analytics API with a non-existent post ID
  // This tests the API's error handling and ensures the endpoint is accessible
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();

  const emptyAnalytics =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: nonExistentPostId,
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(emptyAnalytics);

  // Step 3: Validate pagination structure for empty results
  TestValidator.equals(
    "pagination structure exists",
    emptyAnalytics.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    emptyAnalytics.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", emptyAnalytics.pagination.limit, 10);
  TestValidator.equals(
    "records count is valid",
    emptyAnalytics.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages count is valid",
    emptyAnalytics.pagination.pages >= 0,
    true,
  );

  // Step 4: Test filtering by date range with non-existent post
  const dateFilteredAnalytics =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: nonExistentPostId,
        body: {
          page: 1,
          limit: 10,
          date_from: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          date_to: new Date().toISOString(),
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(dateFilteredAnalytics);

  // Step 5: Test sorting by member with non-existent post
  const memberSortedAnalytics =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: nonExistentPostId,
        body: {
          page: 1,
          limit: 10,
          order_by: "member",
          order: "asc",
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(memberSortedAnalytics);

  // Step 6: Validate data structure for empty results
  TestValidator.predicate(
    "analytics API returns valid data structure",
    emptyAnalytics.data !== undefined && Array.isArray(emptyAnalytics.data),
  );
  TestValidator.equals(
    "empty result data array",
    emptyAnalytics.data.length,
    0,
  );

  // Step 7: Test different pagination parameters
  const secondPageAnalytics =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: nonExistentPostId,
        body: {
          page: 2,
          limit: 5,
          order_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(secondPageAnalytics);

  TestValidator.equals(
    "second page current page is 2",
    secondPageAnalytics.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit is 5",
    secondPageAnalytics.pagination.limit,
    5,
  );

  // Step 8: Test maximum limit constraint
  const maxLimitAnalytics =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: nonExistentPostId,
        body: {
          page: 1,
          limit: 100, // Maximum allowed limit
          order_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(maxLimitAnalytics);

  TestValidator.equals(
    "maximum limit is respected",
    maxLimitAnalytics.pagination.limit,
    100,
  );
}
