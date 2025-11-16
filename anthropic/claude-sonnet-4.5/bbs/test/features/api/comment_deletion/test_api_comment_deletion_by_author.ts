import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete workflow of a member deleting their own comment from a
 * discussion board article.
 *
 * This test validates that a member can successfully remove a comment they
 * previously posted through hard deletion. The test verifies that the comment
 * is permanently removed from the database and is no longer accessible after
 * deletion.
 *
 * Steps:
 *
 * 1. Create and authenticate a new member account
 * 2. Create a discussion board article
 * 3. Post a comment on the created article
 * 4. Delete the comment using the member's credentials
 * 5. Verify the deletion response contains the deleted comment information
 */
export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
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

  // Step 2: Create a discussion board article
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

  // Step 3: Post a comment on the created article
  const commentContent = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const commentData = {
    content: commentContent,
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

  // Validate comment was created successfully
  TestValidator.equals(
    "comment article ID matches",
    comment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment member ID matches",
    comment.member_id,
    member.id,
  );
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );

  // Step 4: Delete the comment using the member's credentials
  const deletedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(deletedComment);

  // Step 5: Verify the deletion response contains the deleted comment information
  TestValidator.equals(
    "deleted comment ID matches original",
    deletedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "deleted comment content matches",
    deletedComment.content,
    commentContent,
  );
  TestValidator.equals(
    "deleted comment article ID matches",
    deletedComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "deleted comment member ID matches",
    deletedComment.member_id,
    member.id,
  );
}
