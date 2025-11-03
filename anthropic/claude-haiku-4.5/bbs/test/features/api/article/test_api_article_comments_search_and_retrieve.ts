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
 * Test comprehensive search and retrieval of comments on a specific article
 * with filtering and pagination.
 *
 * This test validates the comment discovery workflow including searching
 * comments by text content, filtering by status, sorting by creation date or
 * reply count, and paginating through large comment sets. The test creates an
 * article, posts multiple comments with varying content and timestamps, then
 * retrieves and filters the comments using different search criteria.
 *
 * Workflow:
 *
 * 1. Register a member account
 * 2. Create an article for comment testing
 * 3. Post multiple comments with different content to the article
 * 4. Test comment search API with various filters and pagination
 * 5. Validate pagination results
 * 6. Validate sorting by creation date
 * 7. Validate search by keyword
 * 8. Validate status filtering
 */
export async function test_api_article_comments_search_and_retrieve(
  connection: api.IConnection,
) {
  // 1. Register a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member registration succeeded",
    member.id !== null && member.id !== undefined,
  );

  // 2. Create an article for comment testing
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Discussion on Economic Trends",
        content:
          "This article discusses various economic trends and market analysis that would be of interest to economists and policy makers.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate(
    "article creation succeeded",
    article.id !== null && article.id !== undefined,
  );

  // 3. Post multiple comments with different content to the article
  const comments: IDiscussionBoardComment[] = [];

  // Create 5 comments with different content
  const commentContents = [
    "The inflation rates have been quite concerning lately",
    "Interest rate decisions are crucial for economic stability",
    "Market volatility is affecting investor confidence",
    "Supply chain disruptions continue to impact pricing",
    "Consumer spending patterns show interesting trends",
  ];

  for (const content of commentContents) {
    const comment: IDiscussionBoardComment =
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: content,
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  TestValidator.predicate(
    "all comments created successfully",
    comments.length === 5,
  );

  // 4. Test comment search API - Default pagination (page 1, limit 20)
  const defaultPaginationResult: IPageIDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(defaultPaginationResult);
  TestValidator.equals(
    "default pagination returns all 5 comments",
    defaultPaginationResult.data.length,
    5,
  );
  TestValidator.equals(
    "pagination current page is 1",
    defaultPaginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    defaultPaginationResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "total records count is 5",
    defaultPaginationResult.pagination.records === 5,
  );

  // 5. Test pagination with smaller limit
  const page1Result: IPageIDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 with limit 2 returns 2 items",
    page1Result.data.length,
    2,
  );
  TestValidator.equals(
    "pagination current page is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    page1Result.pagination.limit,
    2,
  );

  // 6. Test second page
  const page2Result: IPageIDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 2,
        limit: 2,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 with limit 2 returns 2 items",
    page2Result.data.length,
    2,
  );
  TestValidator.equals(
    "pagination current page is 2",
    page2Result.pagination.current,
    2,
  );

  // 7. Test search by keyword
  const searchResult: IPageIDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        search: "inflation",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchResult);
  TestValidator.predicate(
    "search for 'inflation' returns matching comment",
    searchResult.data.length > 0,
  );

  // 8. Test sorting by creation date ascending
  const sortAscResult: IPageIDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        sort_by: "created_at",
        order: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(sortAscResult);
  TestValidator.predicate(
    "sort ascending returns results",
    sortAscResult.data.length > 0,
  );

  // 9. Test sorting by creation date descending
  const sortDescResult: IPageIDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        sort_by: "created_at",
        order: "desc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(sortDescResult);
  TestValidator.predicate(
    "sort descending returns results",
    sortDescResult.data.length > 0,
  );

  // 10. Test status filtering for published comments
  const publishedOnlyResult: IPageIDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        status: "published",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(publishedOnlyResult);
  TestValidator.predicate(
    "filter by status=published returns results",
    publishedOnlyResult.data.length > 0,
  );
  TestValidator.predicate(
    "all returned comments are published",
    publishedOnlyResult.data.every((c) => c.status === "published"),
  );

  // 11. Test sorting by reply count
  const sortByReplyCountResult: IPageIDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        sort_by: "reply_count",
        order: "desc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(sortByReplyCountResult);
  TestValidator.predicate(
    "sort by reply_count returns results",
    sortByReplyCountResult.data.length > 0,
  );

  // 12. Test empty search result with non-matching keyword
  const emptySearchResult: IPageIDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        search: "nonexistingkeywordfortest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "search for non-matching keyword returns empty results",
    emptySearchResult.data.length,
    0,
  );
}
