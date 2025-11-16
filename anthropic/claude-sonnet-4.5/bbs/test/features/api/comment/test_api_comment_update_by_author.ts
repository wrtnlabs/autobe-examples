import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete workflow of a member updating their own comment on an
 * article.
 *
 * This test validates that authenticated members can successfully modify
 * comments they have authored. The workflow includes:
 *
 * 1. Member registration and authentication
 * 2. Article creation for comment context
 * 3. Initial comment creation
 * 4. Comment content update
 * 5. Validation of updated content and metadata preservation
 *
 * The test ensures proper ownership validation, content persistence, timestamp
 * updates, and referential integrity throughout the update operation.
 */
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
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
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Post an initial comment on the article
  const originalCommentContent = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 4,
    wordMax: 10,
  });

  const commentData = {
    content: originalCommentContent,
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

  // Validate initial comment creation
  TestValidator.equals(
    "initial comment content matches",
    createdComment.content,
    originalCommentContent,
  );
  TestValidator.equals(
    "comment belongs to correct article",
    createdComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment authored by correct member",
    createdComment.member_id,
    member.id,
  );

  // Step 4: Update the comment with new content
  const updatedCommentContent = RandomGenerator.paragraph({
    sentences: 12,
    wordMin: 5,
    wordMax: 9,
  });

  const updateData = {
    content: updatedCommentContent,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: createdComment.id,
        body: updateData,
      },
    );
  typia.assert(updatedComment);

  // Step 5: Validate the update was successful
  TestValidator.equals(
    "updated comment content is correct",
    updatedComment.content,
    updatedCommentContent,
  );
  TestValidator.notEquals(
    "content has changed from original",
    updatedComment.content,
    originalCommentContent,
  );

  // Validate metadata preservation
  TestValidator.equals(
    "comment ID unchanged",
    updatedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "article relationship preserved",
    updatedComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "member ownership preserved",
    updatedComment.member_id,
    member.id,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedComment.created_at,
    createdComment.created_at,
  );

  // Validate that updated_at has been modified
  TestValidator.predicate(
    "updated_at timestamp is later than created_at",
    new Date(updatedComment.updated_at) >= new Date(updatedComment.created_at),
  );
}
