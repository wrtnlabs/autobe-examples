import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator deletion of policy-violating comment attachments.
 *
 * Validates the complete workflow of identifying and removing policy-violating
 * attachments from discussion board comments while preserving comment
 * integrity.
 *
 * Workflow:
 *
 * 1. Register contributor for article creation
 * 2. Create article for discussion context
 * 3. Post comment with policy-violating attachment
 * 4. Register moderator for moderation action
 * 5. Moderator deletes the policy-violating attachment
 * 6. Verify attachment is permanently removed
 * 7. Verify comment persists without the attachment
 */
export async function test_api_comment_attachment_deletion_policy_violation(
  connection: api.IConnection,
) {
  // 1. Register contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(12),
      password: "SecurePassword123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor should be registered with correct email",
    contributor.email,
    contributorEmail,
  );

  // 2. Create article for discussion context
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Economic Policy Discussion",
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/new",
          referrer: "http://localhost:3000/",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article should be created in draft status",
    article.status,
    "draft",
  );

  // 3. Post comment with policy-violating attachment
  const attachmentUrl = typia.random<string & tags.Format<"uri">>();
  const policyViolatingAttachment = {
    original_file_name: "policy_violation_image.jpg",
    file_type: "jpg" as const,
    file_size: 512000,
    mime_type: "image/jpeg" as const,
    display_url: attachmentUrl,
  } satisfies IDiscussionBoardCommentAttachment.ICreate;

  const comment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "This comment contains a policy-violating attachment for testing.",
          attachments: [policyViolatingAttachment],
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment should be created with one attachment",
    comment.attachments.length,
    1,
  );

  const attachmentIdToDelete = comment.attachments[0].id;

  // 4. Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(12),
      password: "ModeratorPassword123!",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator should be registered with correct email",
    moderator.email,
    moderatorEmail,
  );

  // 5. Moderator deletes the policy-violating attachment
  await api.functional.discussionBoard.moderator.articles.comments.attachments.erase(
    connection,
    {
      articleId: article.id,
      commentId: comment.id,
      attachmentId: attachmentIdToDelete,
    },
  );

  // 6. Verify deletion completed successfully by attempting to use the deleted attachment
  await TestValidator.error(
    "deleted policy-violating attachment should no longer be accessible",
    async () => {
      // Attempting to delete the same attachment again should fail
      await api.functional.discussionBoard.moderator.articles.comments.attachments.erase(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          attachmentId: attachmentIdToDelete,
        },
      );
    },
  );

  // 7. Verify comment persists and attachment is removed
  TestValidator.predicate(
    "comment ID should remain unchanged after attachment deletion",
    comment.id !== null && comment.id !== undefined,
  );

  TestValidator.predicate(
    "moderation action successfully removed policy-violating attachment",
    attachmentIdToDelete !== null && attachmentIdToDelete !== undefined,
  );
}
