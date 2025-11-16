import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test public access to retrieve paginated comments for a discussion board
 * article without authentication.
 *
 * This test validates that guests and unauthenticated users can browse article
 * comments freely. It creates test data (member, article, comments) using
 * authenticated requests, then verifies public access to the comment retrieval
 * endpoint works without authentication.
 *
 * Workflow:
 *
 * 1. Create member account and authenticate
 * 2. Create an article as the authenticated member
 * 3. Create multiple comments on the article
 * 4. Test public (unauthenticated) access to retrieve comments with pagination
 * 5. Validate pagination structure, comment data, sorting, and search
 *    functionality
 */
export async function test_api_article_comments_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create member account for test data setup
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create an article as the authenticated member
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Create multiple comments on the article
  const commentContents = [
    "This is a great discussion about economic policy and its impact on small businesses.",
    "I agree with the main points, especially regarding fiscal responsibility.",
    "However, we should also consider the social implications of these policies.",
    "The data presented supports a balanced approach to reform.",
    "Political discourse requires evidence-based analysis like this.",
  ];

  const createdComments: IDiscussionBoardComment[] = [];
  for (const content of commentContents) {
    const commentData = {
      content: content,
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
    createdComments.push(comment);
  }

  // Step 4: Create unauthenticated connection for public access testing
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  // Step 5: Test basic public retrieval without authentication
  const basicRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardComment.IRequest;

  const basicResponse: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(
      publicConnection,
      {
        articleId: article.id,
        body: basicRequest,
      },
    );
  typia.assert(basicResponse);

  // Step 6: Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    basicResponse.pagination !== null && basicResponse.pagination !== undefined,
  );
  TestValidator.equals("current page", basicResponse.pagination.current, 1);
  TestValidator.equals("page limit", basicResponse.pagination.limit, 10);
  TestValidator.equals(
    "total records",
    basicResponse.pagination.records,
    commentContents.length,
  );

  // Step 7: Validate comment data structure
  TestValidator.predicate(
    "data array exists and has comments",
    Array.isArray(basicResponse.data) && basicResponse.data.length > 0,
  );
  TestValidator.equals(
    "comment count matches",
    basicResponse.data.length,
    commentContents.length,
  );

  // Step 8: Validate each comment summary contains required fields
  for (const commentSummary of basicResponse.data) {
    typia.assert(commentSummary);
    TestValidator.predicate(
      "comment has id",
      commentSummary.id !== null && commentSummary.id !== undefined,
    );
    TestValidator.predicate(
      "comment has content",
      commentSummary.content !== null && commentSummary.content !== undefined,
    );
    TestValidator.predicate(
      "comment has created_at",
      commentSummary.created_at !== null &&
        commentSummary.created_at !== undefined,
    );
    TestValidator.predicate(
      "comment has updated_at",
      commentSummary.updated_at !== null &&
        commentSummary.updated_at !== undefined,
    );
    TestValidator.predicate(
      "comment has author",
      commentSummary.author !== null && commentSummary.author !== undefined,
    );
    TestValidator.predicate(
      "comment has article reference",
      commentSummary.article !== null && commentSummary.article !== undefined,
    );
    TestValidator.equals(
      "article reference matches",
      commentSummary.article.id,
      article.id,
    );
  }

  // Step 9: Test pagination with different page sizes
  const smallPageRequest = {
    page: 1,
    limit: 2,
  } satisfies IDiscussionBoardComment.IRequest;

  const smallPageResponse: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(
      publicConnection,
      {
        articleId: article.id,
        body: smallPageRequest,
      },
    );
  typia.assert(smallPageResponse);
  TestValidator.equals(
    "small page limit works",
    smallPageResponse.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "small page has max 2 items",
    smallPageResponse.data.length <= 2,
  );

  // Step 10: Test sorting by created_at ascending
  const sortAscRequest = {
    sortBy: "created_at" as const,
    order: "asc" as const,
    limit: 100,
  } satisfies IDiscussionBoardComment.IRequest;

  const sortAscResponse: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(
      publicConnection,
      {
        articleId: article.id,
        body: sortAscRequest,
      },
    );
  typia.assert(sortAscResponse);
  TestValidator.predicate(
    "ascending sort returns data",
    sortAscResponse.data.length > 0,
  );

  // Step 11: Test sorting by created_at descending
  const sortDescRequest = {
    sortBy: "created_at" as const,
    order: "desc" as const,
    limit: 100,
  } satisfies IDiscussionBoardComment.IRequest;

  const sortDescResponse: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(
      publicConnection,
      {
        articleId: article.id,
        body: sortDescRequest,
      },
    );
  typia.assert(sortDescResponse);
  TestValidator.predicate(
    "descending sort returns data",
    sortDescResponse.data.length > 0,
  );

  // Step 12: Test search functionality with keyword
  const searchRequest = {
    search: "economic",
    limit: 100,
  } satisfies IDiscussionBoardComment.IRequest;

  const searchResponse: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(
      publicConnection,
      {
        articleId: article.id,
        body: searchRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search returns filtered results",
    searchResponse.data.length > 0 &&
      searchResponse.data.length <= commentContents.length,
  );

  // Step 13: Verify search actually filtered by keyword
  const foundComment = searchResponse.data.find((c) =>
    c.content.includes("economic"),
  );
  TestValidator.predicate(
    "search found matching comment",
    foundComment !== undefined,
  );

  // Step 14: Test sorting by updated_at
  const sortByUpdateRequest = {
    sortBy: "updated_at" as const,
    order: "desc" as const,
    limit: 100,
  } satisfies IDiscussionBoardComment.IRequest;

  const sortByUpdateResponse: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(
      publicConnection,
      {
        articleId: article.id,
        body: sortByUpdateRequest,
      },
    );
  typia.assert(sortByUpdateResponse);
  TestValidator.predicate(
    "sort by updated_at works",
    sortByUpdateResponse.data.length > 0,
  );

  // Step 15: Test maximum page size limit
  const maxLimitRequest = {
    page: 1,
    limit: 100,
  } satisfies IDiscussionBoardComment.IRequest;

  const maxLimitResponse: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(
      publicConnection,
      {
        articleId: article.id,
        body: maxLimitRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit accepted",
    maxLimitResponse.pagination.limit,
    100,
  );
}
