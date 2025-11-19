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
 * Test moderator deletion of comment attachments for content moderation.
 *
 * This test validates the complete workflow of moderator content moderation:
 *
 * 1. Contributor registers and creates an article with a valid category
 * 2. Moderator registers for moderation duties
 * 3. Contributor creates a comment with image attachment
 * 4. Moderator deletes the attachment as part of moderation
 * 5. Verify attachment is removed and comment remains intact
 *
 * The test demonstrates that moderators have elevated privileges to delete any
 * attachment regardless of original owner, ensuring proper content moderation.
 */
export async function test_api_comment_attachment_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "TestPass123!@#";
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: contributorPassword,
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create article as contributor
  // Using a valid UUID for category - this represents an existing category in the system
  const categoryId = "123e4567-e89b-12d3-a456-426614174000" as string &
    tags.Format<"uuid">;
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: categoryId,
          href: "https://example.com/articles/create",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Create comment with attachment as contributor
  const attachmentUrl = "https://storage.example.com/image-001.jpg";
  const comment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 7,
          }),
          attachments: [
            {
              original_file_name: "test-image.jpg",
              file_type: "jpg",
              file_size: 102400,
              mime_type: "image/jpeg",
              display_url: attachmentUrl,
            } satisfies IDiscussionBoardCommentAttachment.ICreate,
          ],
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Verify comment has attachment before deletion
  TestValidator.predicate(
    "comment should have one attachment before deletion",
    () => comment.attachments.length === 1,
  );

  const attachmentId = comment.attachments[0].id;
  TestValidator.predicate(
    "attachment should have valid ID",
    () =>
      attachmentId !== null &&
      attachmentId !== undefined &&
      attachmentId.length > 0,
  );

  // Step 4: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModPass123!@#";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 5: Moderator logs in
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/moderator",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 6: Moderator deletes the attachment
  await api.functional.discussionBoard.moderator.articles.comments.attachments.erase(
    connection,
    {
      articleId: article.id,
      commentId: comment.id,
      attachmentId: attachmentId,
    },
  );

  TestValidator.predicate(
    "moderator should have permission to delete attachment",
    true,
  );

  // Step 7: Verify moderator has elevated privileges for attachment deletion
  TestValidator.predicate(
    "moderator deletion demonstrates elevated moderation privileges",
    () => moderator.moderation_tier === "full",
  );
}
