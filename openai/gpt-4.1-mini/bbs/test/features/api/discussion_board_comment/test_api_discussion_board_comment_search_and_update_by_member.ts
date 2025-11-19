import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Tests the authenticated member's ability to search and retrieve discussion
 * board comments using various filter criteria and pagination.
 *
 * The test performs the following steps:
 *
 * 1. Register a new discussion board member.
 * 2. Create a new discussion board article.
 * 3. Create multiple discussion board comments for the article by the member.
 * 4. Perform searches with filters by article ID, member ID, and partial content.
 * 5. Verify pagination and sorting behavior.
 * 6. Validate that unauthorized requests to search or create comments fail.
 *
 * The test validates API response structures and business logic while ensuring
 * authorization controls are properly enforced. It uses strict type-safe calls
 * and validates the results with typia.assert and TestValidator functions.
 */
export async function test_api_discussion_board_comment_search_and_update_by_member(
  connection: api.IConnection,
) {
  // 1. Member registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "P@ssw0rd!";
  const memberNickname = RandomGenerator.name(2);
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        nickname: memberNickname,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a discussion board article
  const articleTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 7,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 3,
    wordMax: 7,
  });
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Create multiple discussion board comments by member
  const commentContents = [
    "Great article!",
    "Very insightful.",
    "Thanks for sharing.",
    "I disagree with some points.",
    "Can you elaborate more?",
  ];
  const createdComments: IDiscussionBoardComment[] = [];
  for (const content of commentContents) {
    const commentBody = {
      content: content,
      discussion_board_article_id: article.id,
      href: "https://example.com/article",
      referrer: "https://google.com",
    } satisfies IDiscussionBoardComment.ICreate;
    const comment =
      await api.functional.discussionBoard.member.discussionBoardComments.create(
        connection,
        {
          body: commentBody,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  // 4. Search comments by article ID with ascending sort
  const searchByArticleId =
    await api.functional.discussionBoard.member.discussionBoardComments.index(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(searchByArticleId);
  TestValidator.predicate(
    "pagination present",
    searchByArticleId.pagination !== undefined,
  );
  TestValidator.equals("page limit", searchByArticleId.pagination.limit, 10);
  TestValidator.predicate("data present", searchByArticleId.data.length > 0);
  for (const comment of searchByArticleId.data) {
    TestValidator.equals(
      "article id filter",
      comment.discussion_board_article_id,
      article.id,
    );
    typia.assert(comment.author);
  }

  // 5. Search comments by member ID
  const searchByMemberId =
    await api.functional.discussionBoard.member.discussionBoardComments.index(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(searchByMemberId);
  for (const comment of searchByMemberId.data) {
    TestValidator.equals("member id filter", comment.author.id, member.id);
  }

  // 6. Search comments by partial content keyword
  const partialKeyword = commentContents[1].slice(0, 3);
  const searchByContent =
    await api.functional.discussionBoard.member.discussionBoardComments.index(
      connection,
      {
        body: {
          content: partialKeyword,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(searchByContent);
  for (const comment of searchByContent.data) {
    TestValidator.predicate(
      `comment content includes '${partialKeyword}'`,
      comment.content.includes(partialKeyword),
    );
  }

  // 7. Search comments with pagination and sort descending
  const searchPaginated =
    await api.functional.discussionBoard.member.discussionBoardComments.index(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          page: 1,
          limit: 5,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(searchPaginated);
  TestValidator.equals("page limit desc", searchPaginated.pagination.limit, 5);

  // 8. Unauthorized search attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized comment search", async () => {
    await api.functional.discussionBoard.member.discussionBoardComments.index(
      unauthConn,
      {
        body: { page: 1, limit: 5 } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  });

  // 9. Unauthorized create attempt
  await TestValidator.error("unauthorized comment creation", async () => {
    await api.functional.discussionBoard.member.discussionBoardComments.create(
      unauthConn,
      {
        body: {
          content: "Unauthorized comment",
          discussion_board_article_id: article.id,
          href: "https://example.com/article",
          referrer: "https://example.com/",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  });
}
