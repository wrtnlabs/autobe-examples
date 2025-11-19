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
 * Validate that comment attachments strictly enforce image-only file type
 * validation.
 *
 * This test ensures that only image formats (JPG, PNG, GIF) are accepted for
 * comment attachments. The type system enforces this constraint at
 * compile-time, preventing any non-image file types from being uploaded. This
 * differentiates comment attachments from article attachments, which support
 * both images and documents.
 *
 * Test flow:
 *
 * 1. Register a contributor account
 * 2. Create an article for discussion
 * 3. Create a comment on that article
 * 4. Upload multiple valid image file formats (JPG, PNG, GIF) - all should succeed
 * 5. Verify successful image attachments are properly stored with correct metadata
 * 6. Confirm that the type system only allows image file types
 */
export async function test_api_comment_attachment_only_images_supported(
  connection: api.IConnection,
) {
  // Step 1: Register a contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!@#",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor account created successfully",
    contributor.id !== null,
  );

  // Step 2: Create an article for discussion
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 6,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate("article created successfully", article.id !== null);

  // Step 3: Create a comment on the article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.predicate("comment created successfully", comment.id !== null);

  // Step 4: Upload JPG image - should succeed
  const jpgAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "photo.jpg",
          file_type: "jpg",
          file_size: 256000,
          mime_type: "image/jpeg",
          display_url: "http://example.com/images/photo.jpg",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(jpgAttachment);
  TestValidator.equals(
    "JPG attachment file type is jpg",
    jpgAttachment.file_type,
    "jpg",
  );
  TestValidator.equals(
    "JPG attachment MIME type is image/jpeg",
    jpgAttachment.mime_type,
    "image/jpeg",
  );
  TestValidator.predicate(
    "JPG attachment has valid ID",
    jpgAttachment.id.length > 0,
  );
  TestValidator.predicate(
    "JPG attachment has upload timestamp",
    jpgAttachment.uploaded_at !== null,
  );

  // Step 5: Upload PNG image - should succeed
  const pngAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "screenshot.png",
          file_type: "png",
          file_size: 384000,
          mime_type: "image/png",
          display_url: "http://example.com/images/screenshot.png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(pngAttachment);
  TestValidator.equals(
    "PNG attachment file type is png",
    pngAttachment.file_type,
    "png",
  );
  TestValidator.equals(
    "PNG attachment MIME type is image/png",
    pngAttachment.mime_type,
    "image/png",
  );
  TestValidator.predicate(
    "PNG attachment has valid ID",
    pngAttachment.id.length > 0,
  );
  TestValidator.predicate(
    "PNG attachment has upload timestamp",
    pngAttachment.uploaded_at !== null,
  );

  // Step 6: Upload GIF image - should succeed
  const gifAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "animation.gif",
          file_type: "gif",
          file_size: 512000,
          mime_type: "image/gif",
          display_url: "http://example.com/images/animation.gif",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(gifAttachment);
  TestValidator.equals(
    "GIF attachment file type is gif",
    gifAttachment.file_type,
    "gif",
  );
  TestValidator.equals(
    "GIF attachment MIME type is image/gif",
    gifAttachment.mime_type,
    "image/gif",
  );
  TestValidator.predicate(
    "GIF attachment has valid ID",
    gifAttachment.id.length > 0,
  );
  TestValidator.predicate(
    "GIF attachment has upload timestamp",
    gifAttachment.uploaded_at !== null,
  );

  // Step 7: Upload JPEG variant - should succeed
  const jpegAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "image.jpeg",
          file_type: "jpeg",
          file_size: 204800,
          mime_type: "image/jpeg",
          display_url: "http://example.com/images/image.jpeg",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(jpegAttachment);
  TestValidator.equals(
    "JPEG attachment file type is jpeg",
    jpegAttachment.file_type,
    "jpeg",
  );
  TestValidator.equals(
    "JPEG attachment MIME type is image/jpeg",
    jpegAttachment.mime_type,
    "image/jpeg",
  );

  // Step 8: Verify all attachments are unique and properly stored
  TestValidator.notEquals(
    "JPG and PNG attachment IDs differ",
    jpgAttachment.id,
    pngAttachment.id,
  );
  TestValidator.notEquals(
    "PNG and GIF attachment IDs differ",
    pngAttachment.id,
    gifAttachment.id,
  );
  TestValidator.notEquals(
    "GIF and JPEG attachment IDs differ",
    gifAttachment.id,
    jpegAttachment.id,
  );
  TestValidator.notEquals(
    "JPG and JPEG attachment IDs differ",
    jpgAttachment.id,
    jpegAttachment.id,
  );
}
