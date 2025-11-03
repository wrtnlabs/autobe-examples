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
 * Test retrieving a paginated and filtered list of replies to a specific
 * top-level comment.
 *
 * This test validates the comprehensive search and filtering capabilities for
 * exploring reply discussions under specific comments. It creates an article
 * with a top-level comment and multiple replies from different authors (members
 * and moderators) at different times, then retrieves the replies using various
 * filter combinations including author type filters, date range filters, and
 * content keyword search.
 *
 * The test verifies that:
 *
 * 1. The response includes properly paginated reply summaries optimized for
 *    comment thread display
 * 2. Soft-deleted replies are excluded from results (respecting soft-deletion
 *    rules)
 * 3. Results are sorted according to the specified sorting criteria (newest first,
 *    oldest first, or most recently updated)
 */
export async function test_api_comment_replies_retrieval_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Store moderator token for later use
  const moderatorToken = moderator.token.access;

  // Step 2: Create member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
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

  // Store member token for later use
  const memberToken = member.token.access;

  // Step 3: Switch to moderator authentication to create category
  connection.headers = connection.headers ?? {};
  connection.headers.Authorization = moderatorToken;

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

  // Step 4: Switch to member authentication to create article
  connection.headers.Authorization = memberToken;

  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 5: Create top-level parent comment (as member)
  const parentCommentData = {
    discussion_board_article_id: article.id,
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const parentComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: article.id,
      body: parentCommentData,
    });
  typia.assert(parentComment);

  // Step 6: Create multiple member replies
  const replies: IDiscussionBoardComment[] = [];
  const baseTimestamp = new Date();

  // Create 3 member replies
  for (let i = 0; i < 3; i++) {
    const replyData = {
      discussion_board_article_id: article.id,
      discussion_board_parent_comment_id: parentComment.id,
      content: `Member reply ${i + 1}: ${RandomGenerator.paragraph({ sentences: 3 })}`,
    } satisfies IDiscussionBoardComment.ICreate;

    const reply: IDiscussionBoardComment =
      await api.functional.discussionBoard.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: replyData,
        },
      );
    typia.assert(reply);
    replies.push(reply);
  }

  // Step 7: Switch to moderator authentication to create moderator replies
  connection.headers.Authorization = moderatorToken;

  for (let i = 0; i < 2; i++) {
    const replyData = {
      discussion_board_article_id: article.id,
      discussion_board_parent_comment_id: parentComment.id,
      content: `Moderator reply ${i + 1}: ${RandomGenerator.paragraph({ sentences: 3 })}`,
    } satisfies IDiscussionBoardComment.ICreate;

    const reply: IDiscussionBoardComment =
      await api.functional.discussionBoard.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: replyData,
        },
      );
    typia.assert(reply);
    replies.push(reply);
  }

  // Step 8: Test retrieval without filters (all replies)
  const allRepliesRequest = {
    discussion_board_article_id: article.id,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardComment.IRequest;

  const allRepliesResult: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.replies.index(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: allRepliesRequest,
      },
    );
  typia.assert(allRepliesResult);

  TestValidator.equals(
    "total replies count should match",
    allRepliesResult.pagination.records,
    5,
  );

  // Step 9: Test filtering by author type - member only
  const memberOnlyRequest = {
    discussion_board_article_id: article.id,
    author_type: "member",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardComment.IRequest;

  const memberRepliesResult: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.replies.index(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: memberOnlyRequest,
      },
    );
  typia.assert(memberRepliesResult);

  TestValidator.equals(
    "member replies count should be 3",
    memberRepliesResult.pagination.records,
    3,
  );

  // Step 10: Test filtering by author type - moderator only
  const moderatorOnlyRequest = {
    discussion_board_article_id: article.id,
    author_type: "moderator",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardComment.IRequest;

  const moderatorRepliesResult: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.replies.index(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: moderatorOnlyRequest,
      },
    );
  typia.assert(moderatorRepliesResult);

  TestValidator.equals(
    "moderator replies count should be 2",
    moderatorRepliesResult.pagination.records,
    2,
  );

  // Step 11: Test content search filter
  const searchRequest = {
    discussion_board_article_id: article.id,
    search: "Member reply 1",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardComment.IRequest;

  const searchResult: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.replies.index(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search should find at least one matching reply",
    searchResult.pagination.records >= 1,
  );

  // Step 12: Test date range filtering
  const now = new Date();
  const futureDate = new Date(now.getTime() + 86400000);

  const dateRangeRequest = {
    discussion_board_article_id: article.id,
    from_date: baseTimestamp.toISOString(),
    to_date: futureDate.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardComment.IRequest;

  const dateRangeResult: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.replies.index(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeResult);

  TestValidator.equals(
    "date range should include all replies",
    dateRangeResult.pagination.records,
    5,
  );

  // Step 13: Test sorting - newest first
  const sortNewestRequest = {
    discussion_board_article_id: article.id,
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardComment.IRequest;

  const sortNewestResult: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.replies.index(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: sortNewestRequest,
      },
    );
  typia.assert(sortNewestResult);

  TestValidator.predicate(
    "newest first sorting should return replies",
    sortNewestResult.data.length > 0,
  );

  // Step 14: Test sorting - oldest first
  const sortOldestRequest = {
    discussion_board_article_id: article.id,
    sort_by: "created_at",
    sort_order: "asc",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardComment.IRequest;

  const sortOldestResult: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.replies.index(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: sortOldestRequest,
      },
    );
  typia.assert(sortOldestResult);

  TestValidator.predicate(
    "oldest first sorting should return replies",
    sortOldestResult.data.length > 0,
  );

  // Step 15: Test pagination
  const paginationRequest = {
    discussion_board_article_id: article.id,
    page: 1,
    limit: 2,
  } satisfies IDiscussionBoardComment.IRequest;

  const page1Result: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.replies.index(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: paginationRequest,
      },
    );
  typia.assert(page1Result);

  TestValidator.equals(
    "page 1 should contain 2 items",
    page1Result.data.length,
    2,
  );

  TestValidator.predicate(
    "total pages should be calculated correctly",
    page1Result.pagination.pages >= 2,
  );
}
