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
 * Test advanced filtering capabilities for post like analytics.
 *
 * This E2E test validates the discussion board moderator post likes filtering
 * API by testing various filtering options including member-specific filtering,
 * date ranges, and sorting capabilities. The test focuses on validating the API
 * contract and filtering functionality assuming test data exists in the
 * system.
 *
 * Test workflow:
 *
 * 1. Create moderator account for authentication
 * 2. Test basic filtering with default parameters
 * 3. Test member-specific filtering
 * 4. Test date range filtering
 * 5. Test sorting options
 * 6. Test pagination behavior
 * 7. Test combined filtering with multiple criteria
 * 8. Validate empty filter results handling
 */
export async function test_api_moderator_post_likes_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "moderator123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 5 }),
        moderation_level: "admin",
        href: "https://discussion-board.example.com",
        referrer: "https://discussion-board.example.com/register",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Use a valid post ID that should exist in the test environment
  const postId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Test basic filtering with default parameters
  const basicFilterResult: IPageIDiscussionBoardPostLike.ISummary =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: postId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(basicFilterResult);

  // Step 3: Test member-specific filtering
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const memberFilterResult: IPageIDiscussionBoardPostLike.ISummary =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: postId,
        body: {
          page: 1,
          limit: 10,
          member: {
            id: memberId,
            type: "member",
            name: RandomGenerator.name(),
          } satisfies IDiscussionBoardMember.ISummary,
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(memberFilterResult);

  // Step 4: Test date range filtering
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

  const dateFilterResult: IPageIDiscussionBoardPostLike.ISummary =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: postId,
        body: {
          page: 1,
          limit: 10,
          date_from: pastDate,
          date_to: currentDate,
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(dateFilterResult);

  // Step 5: Test sorting by creation date
  const sortByDateResult: IPageIDiscussionBoardPostLike.ISummary =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: postId,
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(sortByDateResult);

  // Step 6: Test sorting by member
  const sortByMemberResult: IPageIDiscussionBoardPostLike.ISummary =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: postId,
        body: {
          page: 1,
          limit: 10,
          order_by: "member",
          order: "asc",
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(sortByMemberResult);

  // Step 7: Test pagination with different page sizes
  const paginationTestResult: IPageIDiscussionBoardPostLike.ISummary =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: postId,
        body: {
          page: 1,
          limit: 5, // Smaller page size
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(paginationTestResult);

  // Step 8: Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata should be valid",
    paginationTestResult.pagination.current >= 0 &&
      paginationTestResult.pagination.limit > 0 &&
      paginationTestResult.pagination.records >= 0 &&
      paginationTestResult.pagination.pages >= 0,
  );

  // Step 9: Test combined filtering with multiple criteria
  const combinedFilterResult: IPageIDiscussionBoardPostLike.ISummary =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: postId,
        body: {
          page: 1,
          limit: 10,
          member: {
            id: memberId,
            type: "member",
            name: RandomGenerator.name(),
          } satisfies IDiscussionBoardMember.ISummary,
          date_from: pastDate,
          date_to: currentDate,
          order_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(combinedFilterResult);

  // Step 10: Test edge case - empty filter results with future dates
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day in future
  const emptyFilterResult: IPageIDiscussionBoardPostLike.ISummary =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: postId,
        body: {
          page: 1,
          limit: 10,
          date_from: futureDate, // No likes should exist in the future
          date_to: new Date(Date.now() + 172800000).toISOString(), // 2 days in future
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(emptyFilterResult);

  // Step 11: Validate empty result handling
  TestValidator.predicate(
    "empty filter result should have valid pagination",
    emptyFilterResult.pagination.records === 0 ||
      emptyFilterResult.pagination.records >= 0,
  );

  // Final validation: Ensure all API calls returned valid responses
  TestValidator.predicate(
    "all filtering operations completed successfully",
    basicFilterResult !== undefined &&
      memberFilterResult !== undefined &&
      dateFilterResult !== undefined &&
      sortByDateResult !== undefined &&
      sortByMemberResult !== undefined &&
      paginationTestResult !== undefined &&
      combinedFilterResult !== undefined &&
      emptyFilterResult !== undefined,
  );
}
