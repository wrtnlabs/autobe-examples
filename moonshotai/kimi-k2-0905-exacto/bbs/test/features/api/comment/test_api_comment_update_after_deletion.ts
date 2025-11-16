import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test updating a comment that has been soft-deleted. Validates that comments
 * marked as deleted cannot be updated and returns appropriate error.
 *
 * This test validates the system's behavior when attempting to update a comment
 * that has been soft-deleted. It ensures the platform properly enforces comment
 * integrity by preventing modifications to deleted content, maintaining
 * discussion continuity while preserving historical record through soft
 * deletion mechanism.
 *
 * Workflow steps:
 *
 * 1. Register a new member account to establish authentication context
 * 2. Create an economic discussion article to serve as comment target
 * 3. Add a comment to the article for testing deletion/update scenarios
 * 4. Delete the comment using soft deletion (marks as deleted without removing
 *    from database)
 * 5. Attempt to update the deleted comment, expecting this operation to fail
 * 6. Verify proper error handling and validation for deleted comment updates
 */
export async function test_api_comment_update_after_deletion(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for authentication
  const memberCredentials = {
    username: RandomGenerator.name().replace(/\s/g, "_"),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCredentials,
  });
  typia.assert(member);

  // Step 2: Create an economic discussion article to host comments
  const categoryIds = ArrayUtil.repeat(1, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_ids: categoryIds,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Add a comment to the article for testing
  const commentData = {
    article_id: article.id,
    content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IEconomicDiscussionComment.ICreate;

  const comment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Step 4: Delete the comment using soft deletion
  const deletedComment =
    await api.functional.economicDiscussion.member.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(deletedComment);

  // Verify the comment is marked as deleted
  TestValidator.predicate(
    "comment should be deleted",
    deletedComment.deleted_at !== null,
  );

  // Step 5: Attempt to update the deleted comment - this should fail
  const updatedContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  await TestValidator.error(
    "updating deleted comment should fail",
    async () => {
      await api.functional.economicDiscussion.member.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: { content: updatedContent },
        },
      );
    },
  );

  // Additional verification: update should still fail with the same comment ID
  const anotherUpdateData = {
    content: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IEconomicDiscussionComment.IUpdate;

  await TestValidator.error(
    "multiple update attempts on deleted comment should all fail",
    async () => {
      await api.functional.economicDiscussion.member.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: anotherUpdateData,
        },
      );
    },
  );
}
