import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that retrieving a single comment returns complete contextual information
 * in a single atomic operation.
 *
 * This test validates the atomic operation principle where all necessary
 * context is provided without additional API calls. The test creates a member,
 * article, and comment, then retrieves the comment to verify that the response
 * includes:
 *
 * 1. Complete comment entity with all required fields (id, content, timestamps,
 *    deleted_at)
 * 2. Member summary (IDiscussionBoardMember.ISummary) with author details
 * 3. Article summary (IDiscussionBoardArticle.ISummary) with article context
 *
 * This ensures efficient API design where transformed references eliminate the
 * need for additional GET requests to retrieve author or article information.
 */
export async function test_api_comment_complete_context_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member who will author the comment
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create article that will contain the comment
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Post a comment on the article
  const commentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });
  const commentData = {
    content: commentContent,
  } satisfies IDiscussionBoardComment.ICreate;

  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(createdComment);

  // Step 4: Retrieve the specific comment to test atomic operation completeness
  const retrievedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.at(connection, {
      articleId: article.id,
      commentId: createdComment.id,
    });
  typia.assert(retrievedComment);

  // Step 5: Verify the response includes complete comment entity with all required fields
  TestValidator.equals(
    "comment id matches",
    retrievedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment article id matches",
    retrievedComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment member id matches",
    retrievedComment.member_id,
    member.id,
  );

  // Step 6: Confirm member summary (IDiscussionBoardMember.ISummary) is included with author details
  TestValidator.equals(
    "member summary id matches",
    retrievedComment.member.id,
    member.id,
  );
  TestValidator.equals(
    "member summary username matches",
    retrievedComment.member.username,
    member.username,
  );
  TestValidator.equals(
    "member summary email matches",
    retrievedComment.member.email,
    member.email,
  );

  // Step 7: Confirm article summary (IDiscussionBoardArticle.ISummary) is included with article context
  TestValidator.equals(
    "article summary id matches",
    retrievedComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "article summary title matches",
    retrievedComment.article.title,
    article.title,
  );
  TestValidator.equals(
    "article author matches member",
    retrievedComment.article.author.id,
    member.id,
  );
}
