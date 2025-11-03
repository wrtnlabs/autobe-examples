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

/**
 * Test that a member can successfully update their own comment within 24 hours
 * of creation.
 *
 * This test validates the complete comment update workflow within the 24-hour
 * edit window. It creates a new member account, creates an article, posts a
 * comment on that article, then updates the comment content. The system should
 * increment the edit_count, update the updated_at timestamp, preserve the
 * creation date and author, and display an 'Edited' indicator. The update
 * validates that new content meets length requirements and contains meaningful
 * text.
 *
 * Steps:
 *
 * 1. Register a new member account for the comment author
 * 2. Create an article for the member to comment on
 * 3. Post a comment on the article
 * 4. Update the comment with new content within 24 hours
 * 5. Validate that edit_count incremented, updated_at changed, created_at
 *    preserved
 * 6. Verify new content is properly stored and displayed
 */
export async function test_api_comment_update_within_24_hours(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";
  const memberData = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorizedMember);

  TestValidator.predicate(
    "member registration successful",
    authorizedMember.id !== undefined,
  );
  TestValidator.predicate(
    "access token provided",
    authorizedMember.token.access !== undefined,
  );

  // Step 2: Create an article for commenting
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    { body: articleData },
  );
  typia.assert(article);

  TestValidator.predicate(
    "article created successfully",
    article.id !== undefined,
  );
  TestValidator.equals(
    "article title matches",
    article.title,
    articleData.title,
  );

  // Step 3: Post a comment on the article
  const originalCommentContent = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });

  const commentData = {
    content: originalCommentContent,
  } satisfies IDiscussionBoardComment.ICreate;

  const originalComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(originalComment);

  TestValidator.predicate(
    "comment created successfully",
    originalComment.id !== undefined,
  );
  TestValidator.equals(
    "comment author matches",
    originalComment.author.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "comment content matches",
    originalComment.content,
    originalCommentContent,
  );
  TestValidator.equals(
    "initial edit count is 0",
    originalComment.edit_count,
    0,
  );

  const originalCreatedAt = originalComment.created_at;
  const originalUpdatedAt = originalComment.updated_at;

  // Step 4: Update the comment with new content within 24 hours
  const updatedCommentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });

  const updateData = {
    content: updatedCommentContent,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedComment =
    await api.functional.discussionBoard.articles.comments.update(connection, {
      articleId: article.id,
      commentId: originalComment.id,
      body: updateData,
    });
  typia.assert(updatedComment);

  // Step 5: Validate that edit_count incremented, updated_at changed, created_at preserved
  TestValidator.predicate(
    "comment updated successfully",
    updatedComment.id !== undefined,
  );
  TestValidator.equals(
    "comment ID preserved",
    updatedComment.id,
    originalComment.id,
  );
  TestValidator.equals(
    "comment author preserved",
    updatedComment.author.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "created_at timestamp preserved",
    updatedComment.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    updatedComment.updated_at !== originalUpdatedAt,
  );
  TestValidator.equals(
    "edit_count incremented to 1",
    updatedComment.edit_count,
    1,
  );
  TestValidator.equals(
    "content updated to new value",
    updatedComment.content,
    updatedCommentContent,
  );
  TestValidator.notEquals(
    "new content differs from original",
    updatedComment.content,
    originalCommentContent,
  );
}
