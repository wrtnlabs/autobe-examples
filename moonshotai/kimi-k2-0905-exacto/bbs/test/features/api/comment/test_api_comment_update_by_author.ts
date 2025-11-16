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
 * Test successful comment update by the original author.
 *
 * This test validates the complete workflow of comment ownership and update
 * functionality:
 *
 * - Member registration and authentication
 * - Article creation for commenting
 * - Initial comment creation with valid content
 * - Comment update by the original author
 * - Verification that content is properly updated
 * - Validation of comment ID and article relationship consistency
 *
 * The test ensures that comment update operations are properly restricted to
 * owners and that the API correctly handles content modifications while
 * preserving all necessary relationships and metadata.
 */
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register new member account for authentication
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
  } satisfies IEconomicDiscussionMember.ICreate;

  const authorizedMember: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Step 2: Create an economic discussion article to comment on
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    category_ids: [
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(),
    ],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Create initial comment on the article
  const initialCommentData = {
    article_id: article.id,
    content:
      "This is my initial comment about the economic policy discussion. It provides valuable insights and analysis.",
  } satisfies IEconomicDiscussionComment.ICreate;

  const comment: IEconomicDiscussionComment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: initialCommentData,
      },
    );
  typia.assert(comment);

  // Validate initial comment was created correctly
  TestValidator.equals(
    "comment content matches initial",
    comment.content,
    initialCommentData.content,
  );
  TestValidator.equals(
    "comment article ID matches",
    comment.economic_discussion_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment member ID matches",
    comment.economic_discussion_member_id,
    authorizedMember.member.id,
  );

  // Step 4: Update the comment with new content
  const updatedCommentData = {
    content:
      "This is my updated comment with more detailed economic analysis and revised perspectives on the policy implications.",
  } satisfies IEconomicDiscussionComment.IUpdate;

  const updatedComment: IEconomicDiscussionComment =
    await api.functional.economicDiscussion.member.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: updatedCommentData,
      },
    );
  typia.assert(updatedComment);

  // Step 5: Validate comment update was successful
  TestValidator.equals(
    "comment ID remains unchanged",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "article ID remains unchanged",
    updatedComment.economic_discussion_article_id,
    article.id,
  );
  TestValidator.equals(
    "member ID remains unchanged",
    updatedComment.economic_discussion_member_id,
    authorizedMember.member.id,
  );
  TestValidator.equals(
    "comment content was updated",
    updatedComment.content,
    updatedCommentData.content,
  );
  TestValidator.notEquals(
    "content changed from original",
    updatedComment.content,
    comment.content,
  );

  // Step 6: Validate soft delete and status consistency
  TestValidator.equals(
    "comment status unchanged",
    updatedComment.status,
    comment.status,
  );
  TestValidator.equals(
    "deleted_at remains unchanged",
    updatedComment.deleted_at,
    comment.deleted_at,
  );
}
