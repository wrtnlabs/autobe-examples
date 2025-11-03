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
 * Test keyword search functionality for article comments.
 *
 * This test validates that users can search for specific discussions within
 * comment threads using keyword matching. It creates an article with multiple
 * comments containing different keywords, then performs searches to verify that
 * only comments containing the specified keywords are returned.
 *
 * Process:
 *
 * 1. Create and authenticate a member account
 * 2. Create a category for the article (requires moderator - creating moderator
 *    account)
 * 3. Create an article to hold comments
 * 4. Create multiple comments with specific keywords:
 *
 *    - Comments containing "monetary policy"
 *    - Comments containing "fiscal policy"
 *    - Comments containing "trade agreements"
 *    - Comments with general discussion text
 * 5. Search for "monetary" and verify only matching comments are returned
 * 6. Test case-insensitive search with "MONETARY"
 * 7. Verify partial word matching works correctly
 * 8. Test pagination of search results
 */
export async function test_api_article_comments_keyword_search(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // 2. Create a category for the article
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // 3. Create an article to hold comments
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // 4. Create multiple comments with specific keywords
  const monetaryComments: IDiscussionBoardComment[] = [];
  const fiscalComments: IDiscussionBoardComment[] = [];
  const tradeComments: IDiscussionBoardComment[] = [];

  // Create 3 comments with "monetary policy"
  for (let i = 0; i < 3; i++) {
    const commentData = {
      discussion_board_article_id: article.id,
      discussion_board_parent_comment_id: null,
      content: `This is a discussion about monetary policy and its impact on economic growth. ${RandomGenerator.paragraph({ sentences: 2 })}`,
    } satisfies IDiscussionBoardComment.ICreate;

    const comment: IDiscussionBoardComment =
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        { articleId: article.id, body: commentData },
      );
    typia.assert(comment);
    monetaryComments.push(comment);
  }

  // Create 2 comments with "fiscal policy"
  for (let i = 0; i < 2; i++) {
    const commentData = {
      discussion_board_article_id: article.id,
      discussion_board_parent_comment_id: null,
      content: `Analysis of fiscal policy measures and government spending programs. ${RandomGenerator.paragraph({ sentences: 2 })}`,
    } satisfies IDiscussionBoardComment.ICreate;

    const comment: IDiscussionBoardComment =
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        { articleId: article.id, body: commentData },
      );
    typia.assert(comment);
    fiscalComments.push(comment);
  }

  // Create 2 comments with "trade agreements"
  for (let i = 0; i < 2; i++) {
    const commentData = {
      discussion_board_article_id: article.id,
      discussion_board_parent_comment_id: null,
      content: `International trade agreements are crucial for economic cooperation. ${RandomGenerator.paragraph({ sentences: 2 })}`,
    } satisfies IDiscussionBoardComment.ICreate;

    const comment: IDiscussionBoardComment =
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        { articleId: article.id, body: commentData },
      );
    typia.assert(comment);
    tradeComments.push(comment);
  }

  // Create 3 general comments without specific keywords
  for (let i = 0; i < 3; i++) {
    const commentData = {
      discussion_board_article_id: article.id,
      discussion_board_parent_comment_id: null,
      content: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    } satisfies IDiscussionBoardComment.ICreate;

    const comment: IDiscussionBoardComment =
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        { articleId: article.id, body: commentData },
      );
    typia.assert(comment);
  }

  // 5. Search for "monetary" and verify only matching comments are returned
  const monetarySearchRequest = {
    search: "monetary",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardComment.IRequest;

  const monetaryResults: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: monetarySearchRequest,
    });
  typia.assert(monetaryResults);

  TestValidator.equals(
    "monetary search should return exactly 3 comments",
    monetaryResults.data.length,
    3,
  );

  for (const comment of monetaryResults.data) {
    TestValidator.predicate(
      "comment should contain monetary keyword",
      comment.content.toLowerCase().includes("monetary"),
    );
  }

  // 6. Test case-insensitive search with "MONETARY"
  const uppercaseSearchRequest = {
    search: "MONETARY",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardComment.IRequest;

  const uppercaseResults: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: uppercaseSearchRequest,
    });
  typia.assert(uppercaseResults);

  TestValidator.equals(
    "case-insensitive search should return same count",
    uppercaseResults.data.length,
    monetaryResults.data.length,
  );

  // 7. Verify partial word matching - search for "fiscal"
  const fiscalSearchRequest = {
    search: "fiscal",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardComment.IRequest;

  const fiscalResults: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: fiscalSearchRequest,
    });
  typia.assert(fiscalResults);

  TestValidator.equals(
    "fiscal search should return exactly 2 comments",
    fiscalResults.data.length,
    2,
  );

  for (const comment of fiscalResults.data) {
    TestValidator.predicate(
      "comment should contain fiscal keyword",
      comment.content.toLowerCase().includes("fiscal"),
    );
  }

  // 8. Test pagination - search for "policy" which appears in both monetary and fiscal comments
  const policySearchRequest = {
    search: "policy",
    page: 1,
    limit: 3,
  } satisfies IDiscussionBoardComment.IRequest;

  const policyResults: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: policySearchRequest,
    });
  typia.assert(policyResults);

  TestValidator.predicate(
    "policy search should return comments with limit applied",
    policyResults.data.length <= 3,
  );

  TestValidator.predicate(
    "pagination should indicate at least 5 total records",
    policyResults.pagination.records >= 5,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    policyResults.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request",
    policyResults.pagination.limit,
    3,
  );

  for (const comment of policyResults.data) {
    TestValidator.predicate(
      "comment should contain policy keyword",
      comment.content.toLowerCase().includes("policy"),
    );
  }

  // Verify search for "trade" returns only trade agreement comments
  const tradeSearchRequest = {
    search: "trade",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardComment.IRequest;

  const tradeResults: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: tradeSearchRequest,
    });
  typia.assert(tradeResults);

  TestValidator.equals(
    "trade search should return exactly 2 comments",
    tradeResults.data.length,
    2,
  );

  for (const comment of tradeResults.data) {
    TestValidator.predicate(
      "comment should contain trade keyword",
      comment.content.toLowerCase().includes("trade"),
    );
  }
}
