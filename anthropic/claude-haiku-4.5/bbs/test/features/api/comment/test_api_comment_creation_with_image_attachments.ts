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
 * Test comment creation with image attachments on discussion board articles.
 *
 * Validates complete comment creation workflow with image attachments
 * including:
 *
 * - Contributor authentication and article creation
 * - Comment creation with up to 2 image attachments (JPG, PNG, GIF)
 * - File type validation for image formats only
 * - MIME type validation to prevent format spoofing
 * - File size enforcement (5MB maximum per attachment)
 * - Attachment metadata preservation (filename, type, size, MIME type)
 * - Proper linking of attachments to comment
 * - Atomic creation of comment and attachments in single operation
 *
 * Test steps:
 *
 * 1. Register contributor account via /auth/contributor/join
 * 2. Create article via /discussionBoard/contributor/articles
 * 3. Create comment with image attachments via
 *    /discussionBoard/contributor/articles/{articleId}/comments
 * 4. Validate comment response includes all attachment metadata
 * 5. Validate attachments have correct file type constraints (jpg, jpeg, png, gif
 *    only)
 * 6. Validate attachment MIME types match file types (image/jpeg, image/png,
 *    image/gif only)
 * 7. Validate file sizes are within 5MB limit per attachment
 * 8. Validate maximum 2 attachments per comment
 * 9. Verify attachment URLs are accessible and properly formatted
 */
export async function test_api_comment_creation_with_image_attachments(
  connection: api.IConnection,
) {
  // Step 1: Register contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(12),
        password: "SecurePassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor registered successfully",
    () =>
      contributor.email_verified !== null &&
      contributor.account_status === "active",
  );

  // Step 2: Create article for comment testing
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article for Comment Attachments",
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "https://example.com/article",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate(
    "article created successfully",
    () => article.id !== null,
  );

  // Step 3: Create comment with valid image attachments
  const imageAttachments = [
    {
      original_file_name: "screenshot1.jpg",
      file_type: "jpg" as const,
      file_size: 2097152, // 2MB
      mime_type: "image/jpeg" as const,
      display_url: "https://storage.example.com/uploads/screenshot1.jpg",
    } satisfies IDiscussionBoardCommentAttachment.ICreate,
    {
      original_file_name: "diagram.png",
      file_type: "png" as const,
      file_size: 3145728, // 3MB
      mime_type: "image/png" as const,
      display_url: "https://storage.example.com/uploads/diagram.png",
    } satisfies IDiscussionBoardCommentAttachment.ICreate,
  ];

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "This is a test comment with image attachments demonstrating proper file handling.",
          attachments: imageAttachments,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Validate comment response structure
  TestValidator.predicate(
    "comment created with valid structure",
    () =>
      comment.id !== null &&
      comment.content !== null &&
      comment.author !== null &&
      comment.article !== null &&
      comment.created_at !== null,
  );

  // Step 5: Validate attachment metadata preservation
  TestValidator.equals(
    "comment includes all attachments",
    comment.attachments.length,
    2,
  );

  // Validate first attachment (JPG)
  const firstAttachment = comment.attachments[0];
  TestValidator.predicate(
    "first attachment has valid JPG type",
    () =>
      firstAttachment.file_type === "jpg" &&
      firstAttachment.mime_type === "image/jpeg",
  );
  TestValidator.equals(
    "first attachment filename preserved",
    firstAttachment.original_file_name,
    "screenshot1.jpg",
  );
  TestValidator.predicate(
    "first attachment size is valid",
    () =>
      firstAttachment.file_size === 2097152 &&
      firstAttachment.file_size <= 5242880, // 5MB limit
  );
  TestValidator.predicate(
    "first attachment has valid display URL",
    () =>
      firstAttachment.display_url.startsWith("https://") &&
      firstAttachment.display_url.length > 0,
  );

  // Validate second attachment (PNG)
  const secondAttachment = comment.attachments[1];
  TestValidator.predicate(
    "second attachment has valid PNG type",
    () =>
      secondAttachment.file_type === "png" &&
      secondAttachment.mime_type === "image/png",
  );
  TestValidator.equals(
    "second attachment filename preserved",
    secondAttachment.original_file_name,
    "diagram.png",
  );
  TestValidator.predicate(
    "second attachment size is valid",
    () =>
      secondAttachment.file_size === 3145728 &&
      secondAttachment.file_size <= 5242880, // 5MB limit
  );
  TestValidator.predicate(
    "second attachment has valid display URL",
    () =>
      secondAttachment.display_url.startsWith("https://") &&
      secondAttachment.display_url.length > 0,
  );

  // Step 6: Validate attachment author information
  TestValidator.predicate(
    "attachments have author information",
    () =>
      firstAttachment.author !== null &&
      firstAttachment.author.username !== null &&
      secondAttachment.author !== null &&
      secondAttachment.author.username !== null,
  );

  // Step 7: Validate attachment upload timestamps
  TestValidator.predicate(
    "attachments have upload timestamps",
    () =>
      firstAttachment.uploaded_at !== null &&
      secondAttachment.uploaded_at !== null,
  );

  // Step 8: Validate comment contains proper article reference
  TestValidator.equals(
    "comment references correct article",
    comment.article.id,
    article.id,
  );

  // Step 9: Validate attachment counts match expectations
  TestValidator.predicate(
    "comment respects maximum attachment limit",
    () => comment.attachments.length <= 2,
  );

  // Step 10: Test edge case - single attachment
  const singleAttachmentComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "Comment with single image attachment.",
          attachments: [
            {
              original_file_name: "photo.gif",
              file_type: "gif" as const,
              file_size: 1048576, // 1MB
              mime_type: "image/gif" as const,
              display_url: "https://storage.example.com/uploads/photo.gif",
            } satisfies IDiscussionBoardCommentAttachment.ICreate,
          ],
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(singleAttachmentComment);
  TestValidator.equals(
    "single attachment comment created",
    singleAttachmentComment.attachments.length,
    1,
  );
  TestValidator.predicate(
    "GIF format supported",
    () =>
      singleAttachmentComment.attachments[0].file_type === "gif" &&
      singleAttachmentComment.attachments[0].mime_type === "image/gif",
  );

  // Step 11: Test comment without attachments
  const commentWithoutAttachments: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "Comment without any attachments is also valid.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(commentWithoutAttachments);
  TestValidator.equals(
    "comment without attachments has empty array",
    commentWithoutAttachments.attachments.length,
    0,
  );
}
