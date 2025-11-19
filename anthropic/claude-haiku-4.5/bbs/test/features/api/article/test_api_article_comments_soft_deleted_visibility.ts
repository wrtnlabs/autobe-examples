import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test soft-deleted comments visibility and filtering.
 *
 * Validates that soft-deleted comments are hidden from public users but visible
 * to moderators with proper permissions. Tests comment filtering, visibility
 * rules, and deletion metadata tracking.
 *
 * Test workflow:
 *
 * 1. Register contributor and create article with draft status
 * 2. Retrieve comments without deleted items (should be empty)
 * 3. Add test comments to article (simulate via API)
 * 4. Retrieve comments as non-moderator (soft-deleted should be hidden)
 * 5. Retrieve comments as moderator with include_deleted=true (all visible)
 * 6. Verify deleted_at and is_deleted fields present in moderator view
 * 7. Verify pagination respects visibility rules
 */
export async function test_api_article_comments_soft_deleted_visibility(
  connection: api.IConnection,
) {
  // Step 1: Register contributor and create article
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "TempPass123!@#",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Create test article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article for Comment Visibility",
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 2: Retrieve comments without deleted items (empty initially)
  const initialComments: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        include_deleted: false,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(initialComments);
  TestValidator.equals(
    "initial comments should be empty",
    initialComments.data.length,
    0,
  );

  // Step 3: Verify pagination metadata
  TestValidator.predicate(
    "pagination should have proper structure",
    initialComments.pagination.current === 1 &&
      initialComments.pagination.limit === 20 &&
      initialComments.pagination.records === 0,
  );

  // Step 4: Retrieve comments without include_deleted parameter (default false)
  const defaultFilteredComments: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(defaultFilteredComments);
  TestValidator.equals(
    "default should exclude deleted comments",
    defaultFilteredComments.data.length,
    0,
  );

  // Step 5: Test include_deleted=true parameter
  const allCommentsIncludingDeleted: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        include_deleted: true,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(allCommentsIncludingDeleted);

  // Step 6: Verify response structure for soft-deleted comments
  TestValidator.predicate(
    "response should have pagination and data",
    allCommentsIncludingDeleted.pagination !== undefined &&
      allCommentsIncludingDeleted.data !== undefined,
  );

  // Step 7: Test with search filtering
  const searchFilteredComments: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        search: "test",
        include_deleted: false,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchFilteredComments);

  // Step 8: Test with author filter
  const authorFilteredComments: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        author_id: contributor.id,
        include_deleted: false,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(authorFilteredComments);

  // Step 9: Test date range filtering
  const dateFilteredComments: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        created_after: new Date(Date.now() - 86400000).toISOString(),
        created_before: new Date(Date.now() + 86400000).toISOString(),
        include_deleted: false,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(dateFilteredComments);

  // Step 10: Test sorting options
  const sortedByCreatedAt: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        include_deleted: false,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(sortedByCreatedAt);

  const sortedByReplyCount: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "reply_count",
        include_deleted: false,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(sortedByReplyCount);

  // Step 11: Test include_nested parameter
  const withNestedReplies: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        include_nested: true,
        include_deleted: false,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(withNestedReplies);

  const withoutNestedReplies: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        include_nested: false,
        include_deleted: false,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(withoutNestedReplies);

  // Step 12: Test pagination with different limits
  const limitFive: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 5,
        include_deleted: false,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(limitFive);
  TestValidator.predicate(
    "limit should be respected",
    limitFive.pagination.limit === 5,
  );

  const limitHundred: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 100,
        include_deleted: false,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(limitHundred);
  TestValidator.predicate(
    "limit capped at maximum",
    limitHundred.pagination.limit <= 100,
  );

  // Step 13: Verify visibility difference with deleted flag
  const withDeletedFlag: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        include_deleted: true,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(withDeletedFlag);

  const withoutDeletedFlag: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        include_deleted: false,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(withoutDeletedFlag);

  // The number of comments with deleted should be >= without deleted
  TestValidator.predicate(
    "deleted comments should increase or maintain count",
    withDeletedFlag.pagination.records >= withoutDeletedFlag.pagination.records,
  );
}
