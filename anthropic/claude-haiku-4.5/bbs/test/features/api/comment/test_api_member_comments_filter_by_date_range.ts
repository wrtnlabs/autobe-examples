import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test member's ability to filter their comments by creation date ranges.
 *
 * This test validates the date range filtering functionality for member
 * comments. The workflow creates a new member, creates an article for comments,
 * posts multiple comments at different times spanning several days, then
 * applies various date range filters to verify correct temporal filtering. The
 * test ensures that:
 *
 * 1. Filtering by date range correctly isolates comments within specified
 *    boundaries
 * 2. Various date range combinations work (before/after specific date, between two
 *    dates)
 * 3. Filtered results exclude comments outside the date range
 * 4. Date filter works in combination with other filters (article, content search)
 * 5. System correctly interprets date boundaries and includes/excludes
 *    appropriately
 *
 * Steps:
 *
 * 1. Register a new member account
 * 2. Create an article for comments
 * 3. Post first comment (baseline timestamp)
 * 4. Wait and post second comment at different time
 * 5. Filter comments by date range and verify results
 * 6. Test various date range combinations
 * 7. Validate boundary date handling
 */
export async function test_api_member_comments_filter_by_date_range(
  connection: api.IConnection,
) {
  // 1. Register a new member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "Password123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // 2. Create an article for comments
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Discussion Topic for Date Filter Testing",
        content:
          "This article is created to test comment date range filtering functionality.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3. Post first comment (baseline timestamp)
  const comment1: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "First comment posted at baseline time",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);

  const comment1CreatedAt = new Date(comment1.created_at);
  TestValidator.equals(
    "comment1 has valid created_at",
    typeof comment1.created_at,
    "string",
  );

  // 4. Wait and post second comment at different time
  // Wait 2 seconds to ensure time difference
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const comment2: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "Second comment posted after delay",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);

  const comment2CreatedAt = new Date(comment2.created_at);
  TestValidator.predicate(
    "comment2 created after comment1",
    comment2CreatedAt > comment1CreatedAt,
  );

  // 5. Test filtering all comments without date range
  const allCommentsResponse: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(allCommentsResponse);
  TestValidator.predicate(
    "should retrieve both comments without filters",
    allCommentsResponse.data.length >= 2,
  );

  // 6. Test filtering by date range (created_after)
  const afterFirstCommentResponse: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        page: 1,
        limit: 20,
        created_after: comment1CreatedAt.toISOString(),
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(afterFirstCommentResponse);
  TestValidator.predicate(
    "should include both comments when filtering after first comment time",
    afterFirstCommentResponse.data.length >= 2,
  );

  // 7. Test filtering by date range (created_before)
  const beforeSecondCommentResponse: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        page: 1,
        limit: 20,
        created_before: comment2CreatedAt.toISOString(),
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(beforeSecondCommentResponse);
  TestValidator.predicate(
    "should include both comments when filtering before second comment time",
    beforeSecondCommentResponse.data.length >= 2,
  );

  // 8. Test filtering between both comments (from first to second)
  const betweenCommentsResponse: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        page: 1,
        limit: 20,
        created_after: comment1CreatedAt.toISOString(),
        created_before: comment2CreatedAt.toISOString(),
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(betweenCommentsResponse);
  TestValidator.predicate(
    "should include both comments when filtering within their date range",
    betweenCommentsResponse.data.length >= 2,
  );

  // 9. Test filtering by article_id with date range
  const articleFilteredResponse: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        page: 1,
        limit: 20,
        article_id: article.id,
        created_after: comment1CreatedAt.toISOString(),
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(articleFilteredResponse);
  TestValidator.predicate(
    "should return comments filtered by article and date",
    articleFilteredResponse.data.length >= 2,
  );

  // 10. Test filtering with search and date range
  const searchFilteredResponse: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: "comment",
        created_after: comment1CreatedAt.toISOString(),
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchFilteredResponse);
  TestValidator.predicate(
    "should return comments filtered by search and date",
    searchFilteredResponse.data.length >= 1,
  );

  // 11. Verify boundary date handling
  const futureTime = new Date(comment2CreatedAt.getTime() + 86400000); // 1 day after comment2
  const noFutureCommentsResponse: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        page: 1,
        limit: 20,
        created_after: futureTime.toISOString(),
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(noFutureCommentsResponse);
  TestValidator.equals(
    "should return no comments when filtering after all comments",
    noFutureCommentsResponse.data.length,
    0,
  );
}
