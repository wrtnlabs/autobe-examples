import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test filtering comments by date range on a specific article.
 *
 * This test validates that users can search comments within specific temporal
 * windows to focus on recent or historical discussions. It creates an article
 * with comments posted at different times, then searches for comments filtered
 * by date range parameters.
 *
 * Test workflow:
 *
 * 1. Create member account for authoring
 * 2. Create category for article (as moderator)
 * 3. Create article to hold comments
 * 4. Create multiple comments
 * 5. Test date filtering with from_date only
 * 6. Test date filtering with to_date only
 * 7. Test date filtering with both from_date and to_date
 * 8. Verify pagination works with date filtering
 */
export async function test_api_article_comments_filter_by_date_range(
  connection: api.IConnection,
) {
  // 1. Create member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // 2. Create category (requires moderator role)
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // 3. Create article to hold comments
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 1 }),
    category_ids: [category.id],
    tag_ids: [],
    image_ids: [],
    document_ids: [],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // 4. Create multiple comments
  const comments: IDiscussionBoardComment[] = [];

  for (let i = 0; i < 5; i++) {
    const commentData = {
      discussion_board_article_id: article.id,
      discussion_board_parent_comment_id: null,
      content: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardComment.ICreate;

    const comment: IDiscussionBoardComment =
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: commentData,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // Use actual timestamps from created comments
  const firstCommentTime = new Date(comments[0].created_at);
  const middleCommentTime = new Date(comments[2].created_at);
  const lastCommentTime = new Date(comments[4].created_at);

  // Create date boundaries for filtering
  const beforeFirstComment = new Date(
    firstCommentTime.getTime() - 1000,
  ).toISOString();
  const afterLastComment = new Date(
    lastCommentTime.getTime() + 1000,
  ).toISOString();

  // 5. Test filtering with from_date only
  const fromDateFilter = {
    discussion_board_article_id: article.id,
    from_date: middleCommentTime.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardComment.IRequest;

  const fromDateResult: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: fromDateFilter,
    });
  typia.assert(fromDateResult);

  TestValidator.predicate(
    "from_date filter should return some comments",
    fromDateResult.data.length > 0,
  );

  // 6. Test filtering with to_date only
  const toDateFilter = {
    discussion_board_article_id: article.id,
    to_date: afterLastComment,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardComment.IRequest;

  const toDateResult: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: toDateFilter,
    });
  typia.assert(toDateResult);

  TestValidator.predicate(
    "to_date filter should return all comments",
    toDateResult.data.length === 5,
  );

  // 7. Test filtering with both from_date and to_date (date range)
  const rangeFilter = {
    discussion_board_article_id: article.id,
    from_date: beforeFirstComment,
    to_date: afterLastComment,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardComment.IRequest;

  const rangeResult: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: rangeFilter,
    });
  typia.assert(rangeResult);

  TestValidator.equals(
    "date range filter should return all comments within range",
    rangeResult.data.length,
    5,
  );

  // 8. Verify pagination works correctly with date filtering
  const paginatedFilter = {
    discussion_board_article_id: article.id,
    from_date: beforeFirstComment,
    to_date: afterLastComment,
    page: 1,
    limit: 2,
  } satisfies IDiscussionBoardComment.IRequest;

  const paginatedResult: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: paginatedFilter,
    });
  typia.assert(paginatedResult);

  TestValidator.equals(
    "paginated result should return exactly 2 comments per page",
    paginatedResult.data.length,
    2,
  );

  TestValidator.predicate(
    "pagination metadata should reflect correct total count",
    paginatedResult.pagination.records === 5,
  );

  // Verify returned comments have valid timestamps
  for (const comment of rangeResult.data) {
    TestValidator.predicate(
      "comment should have valid created_at timestamp",
      comment.created_at !== null && comment.created_at !== undefined,
    );
  }
}
