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
 * Test successful comment deletion by the original author.
 *
 * This test validates that a member can create an article, add a comment to
 * that article, and then successfully delete their own comment. The deletion
 * should be properly handled through soft deletion while maintaining the
 * integrity of the article and discussion thread.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as a new member
 * 2. Create a new economic discussion article with valid content
 * 3. Add a comment to the created article
 * 4. Verify the comment was created successfully
 * 5. Delete the comment using the deletion endpoint
 * 6. Verify the comment deletion response matches expected structure
 * 7. Validate that the deleted comment retains proper relationship data
 */
export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a new member
  const memberCreateData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123",
  } satisfies IEconomicDiscussionMember.ICreate;

  const memberAuthorization = await api.functional.auth.member.join(
    connection,
    { body: memberCreateData },
  );
  typia.assert(memberAuthorization);

  // Step 2: Create a new economic discussion article with valid content
  const articleCreateData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleCreateData,
    });
  typia.assert(createdArticle);

  // Step 3: Add a comment to the created article
  const commentCreateData = {
    article_id: createdArticle.id,
    content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IEconomicDiscussionComment.ICreate;

  const createdComment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: commentCreateData,
      },
    );
  typia.assert(createdComment);

  // Step 4: Verify the comment was created successfully
  TestValidator.equals(
    "comment ID format is valid",
    createdComment.id,
    typia.random<string>(),
  );
  TestValidator.equals(
    "comment article ID matches",
    createdComment.economic_discussion_article_id,
    createdArticle.id,
  );
  TestValidator.equals(
    "comment member ID matches",
    createdComment.economic_discussion_member_id,
    memberAuthorization.member.id,
  );
  TestValidator.equals(
    "comment content matches input",
    createdComment.content,
    commentCreateData.content,
  );
  TestValidator.equals(
    "comment status is approved",
    createdComment.status,
    "approved",
  );

  // Step 5: Delete the comment using the deletion endpoint
  const deletedComment =
    await api.functional.economicDiscussion.member.articles.comments.erase(
      connection,
      {
        articleId: createdArticle.id,
        commentId: createdComment.id,
      },
    );
  typia.assert(deletedComment);

  // Step 6: Verify the comment deletion response matches expected structure
  TestValidator.equals(
    "deleted comment ID matches",
    deletedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "deleted comment article ID matches",
    deletedComment.economic_discussion_article_id,
    createdArticle.id,
  );
  TestValidator.equals(
    "deleted comment member ID matches",
    deletedComment.economic_discussion_member_id,
    memberAuthorization.member.id,
  );
  TestValidator.equals(
    "deleted comment content matches original",
    deletedComment.content,
    createdComment.content,
  );

  // Step 7: Validate that the deleted comment retains proper relationship data
  TestValidator.predicate(
    "deleted comment has deletion timestamp",
    deletedComment.deleted_at !== undefined &&
      deletedComment.deleted_at !== null,
  );
  TestValidator.equals(
    "deleted comment maintains status",
    deletedComment.status,
    createdComment.status,
  );
  TestValidator.equals(
    "deleted comment creation timestamp preserved",
    deletedComment.created_at,
    createdComment.created_at,
  );
  TestValidator.equals(
    "deleted comment update timestamp matches",
    deletedComment.updated_at,
    createdComment.updated_at,
  );
}
