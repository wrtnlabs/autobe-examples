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
 * Test pagination functionality for large like datasets
 *
 * Creates moderator account and test posts, then verifies pagination controls
 * work correctly with various page sizes and record counts. Ensures proper
 * calculation of total pages and record counts for accurate analytics
 * reporting.
 */
export async function test_api_moderator_post_likes_pagination(
  connection: api.IConnection,
) {
  // Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "moderator123",
        moderation_level: "admin",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Create multiple member accounts for context
  const members = await ArrayUtil.asyncRepeat(3, async (index) => {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member: IDiscussionBoardMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: memberEmail,
          username: RandomGenerator.name(1),
          password: "member123",
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardMember.ICreate,
      });
    typia.assert(member);
    return member;
  });

  // Create multiple test posts
  const posts = await ArrayUtil.asyncRepeat(2, async (index) => {
    const post: IDiscussionBoardPost =
      await api.functional.discussionBoard.member.posts.create(connection, {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
          discussion_board_channel_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardPost.ICreate,
      });
    typia.assert(post);
    return post;
  });

  // Switch back to moderator account for pagination testing
  await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: "moderator123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Test pagination with different page sizes
  const testPageSizes = [5, 10, 20] as const;

  for (const pageSize of testPageSizes) {
    const paginationResult: IPageIDiscussionBoardPostLike.ISummary =
      await api.functional.discussionBoard.moderator.posts.likes.index(
        connection,
        {
          postId: posts[0].id,
          body: {
            page: 1,
            limit: pageSize,
            order_by: "created_at",
            order: "desc",
          } satisfies IDiscussionBoardPostLike.IRequest,
        },
      );
    typia.assert(paginationResult);

    // Validate pagination metadata
    TestValidator.equals(
      `page size ${pageSize} should return correct limit`,
      paginationResult.pagination.limit,
      pageSize,
    );
    TestValidator.predicate(
      `page size ${pageSize} should have valid record count`,
      paginationResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page size ${pageSize} should have valid page count`,
      paginationResult.pagination.pages >= 0,
    );
    TestValidator.equals(
      `page size ${pageSize} should be on first page`,
      paginationResult.pagination.current,
      1,
    );

    // Validate data array size matches limit (or less if fewer records)
    TestValidator.predicate(
      `page size ${pageSize} data length should not exceed limit`,
      paginationResult.data.length <= pageSize,
    );
  }

  // Test different sorting options
  const sortingOptions = ["created_at", "member"] as const;

  for (const sortBy of sortingOptions) {
    const sortedResult: IPageIDiscussionBoardPostLike.ISummary =
      await api.functional.discussionBoard.moderator.posts.likes.index(
        connection,
        {
          postId: posts[0].id,
          body: {
            page: 1,
            limit: 10,
            order_by: sortBy,
            order: "asc",
          } satisfies IDiscussionBoardPostLike.IRequest,
        },
      );
    typia.assert(sortedResult);

    TestValidator.predicate(
      `sorting by ${sortBy} should return valid data`,
      Array.isArray(sortedResult.data),
    );
  }

  // Test date range filtering
  const dateFilteredResult: IPageIDiscussionBoardPostLike.ISummary =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: posts[0].id,
        body: {
          page: 1,
          limit: 10,
          date_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          date_to: new Date().toISOString(),
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(dateFilteredResult);

  TestValidator.predicate(
    "date filtered result should be valid",
    Array.isArray(dateFilteredResult.data),
  );

  // Validate pagination calculations with maximum page size
  const largePageResult: IPageIDiscussionBoardPostLike.ISummary =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: posts[0].id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(largePageResult);

  // Verify pagination calculations are mathematically correct
  if (
    largePageResult.pagination.records > 0 &&
    largePageResult.pagination.limit > 0
  ) {
    const expectedPages = Math.ceil(
      largePageResult.pagination.records / largePageResult.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation should be correct",
      largePageResult.pagination.pages,
      expectedPages,
    );
  }

  // Test edge case: very small page size
  const smallPageResult: IPageIDiscussionBoardPostLike.ISummary =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: posts[0].id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(smallPageResult);

  TestValidator.equals(
    "smallest page size should have limit 1",
    smallPageResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "smallest page size data length should be 0 or 1",
    smallPageResult.data.length <= 1,
  );
}
