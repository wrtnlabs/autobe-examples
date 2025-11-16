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
 * Test member editing their own comment on economic discussion articles.
 *
 * This test validates that authenticated members can update their comment
 * content to correct errors or clarify statements while maintaining edit
 * history for transparency. Creates an article and comment as a member, then
 * tests the ability to edit the comment content within permitted time windows.
 * Verifies that updated comments show new content with proper modification
 * timestamps.
 */
export async function test_api_member_update_own_comment(
  connection: api.IConnection,
) {
  // 1. Create member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberAccount = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: memberEmail,
      password: "testPassword123",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAccount);

  // 2. Create economic discussion article
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const articleTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });

  const newArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(newArticle);

  // 3. Create comment on the article
  const originalCommentContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  });
  const originalComment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: newArticle.id,
        body: {
          article_id: newArticle.id,
          content: originalCommentContent,
        } satisfies IEconomicDiscussionComment.ICreate,
      },
    );
  typia.assert(originalComment);

  // 4. Update the comment with new content
  const updatedCommentContent = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 6,
    wordMax: 15,
  });
  const updatedComment =
    await api.functional.economicDiscussion.articles.comments.update(
      connection,
      {
        articleId: newArticle.id,
        commentId: originalComment.id,
        body: {
          content: updatedCommentContent,
        } satisfies IEconomicDiscussionComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // 5. Verify the update was successful
  TestValidator.equals(
    "comment ID matches",
    updatedComment.id,
    originalComment.id,
  );
  TestValidator.equals(
    "article ID matches",
    updatedComment.economic_discussion_article_id,
    newArticle.id,
  );
  TestValidator.equals(
    "member ID matches",
    updatedComment.economic_discussion_member_id,
    memberAccount.member.id,
  );
  TestValidator.equals(
    "content was updated",
    updatedComment.content,
    updatedCommentContent,
  );
  TestValidator.notEquals(
    "revision count increased",
    updatedComment.updated_at,
    originalComment.updated_at,
  );
  TestValidator.predicate(
    "content length is valid",
    () =>
      updatedComment.content.length >= 10 &&
      updatedComment.content.length <= 1000,
  );
}
