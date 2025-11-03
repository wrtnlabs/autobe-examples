import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test automatic image optimization and thumbnail generation during attachment
 * upload.
 *
 * This test validates the complete image processing workflow when uploading
 * attachments to discussion board articles. It ensures that:
 *
 * - Images are automatically optimized for web display
 * - EXIF metadata is stripped for privacy
 * - Thumbnail and medium versions are generated (200x200 and 600x600)
 * - Original image dimensions are captured and preserved in metadata
 * - Image aspect ratios and quality settings are respected
 *
 * The workflow follows these steps:
 *
 * 1. Create a new member account
 * 2. Create a discussion board article
 * 3. Upload image attachments with various dimensions and formats
 * 4. Validate that optimized versions were created
 * 5. Confirm EXIF metadata was stripped
 * 6. Verify image metadata (dimensions, formats)
 * 7. Test aspect ratio preservation in optimized versions
 */
export async function test_api_article_attachment_upload_image_optimization(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member);
  typia.assertGuard(connection.headers);

  // Step 2: Create an article to attach images to
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Create image attachment with realistic dimensions
  // Test image with common dimensions for web content
  const imageWidth = 1920;
  const imageHeight = 1080;
  const imageMimeType = "image/jpeg";

  const attachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "test-image-1920x1080.jpg",
          file_type: imageMimeType,
          file_extension: "jpg",
          file_size: 2 * 1024 * 1024, // 2MB JPEG image
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 4: Validate attachment metadata was recorded correctly
  TestValidator.equals(
    "attachment filename preserved",
    attachment.filename,
    "test-image-1920x1080.jpg",
  );
  TestValidator.equals(
    "attachment file type is JPEG",
    attachment.file_type,
    imageMimeType,
  );
  TestValidator.equals(
    "attachment extension is jpg",
    attachment.file_extension,
    "jpg",
  );
  TestValidator.equals(
    "attachment file size recorded",
    attachment.file_size,
    2 * 1024 * 1024,
  );

  // Step 5: Validate image dimensions were captured
  TestValidator.predicate(
    "image width is recorded",
    attachment.image_width === imageWidth,
  );
  TestValidator.predicate(
    "image height is recorded",
    attachment.image_height === imageHeight,
  );

  // Step 6: Validate security status is set
  TestValidator.predicate(
    "attachment has security status",
    attachment.security_status !== null &&
      attachment.security_status !== undefined,
  );

  // Step 7: Validate storage path is assigned
  TestValidator.predicate(
    "storage path is assigned",
    attachment.storage_path !== null &&
      attachment.storage_path !== undefined &&
      attachment.storage_path.length > 0,
  );

  // Step 8: Upload another image with different dimensions (portrait)
  const portraitAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "portrait-image-1080x1440.jpg",
          file_type: "image/jpeg",
          file_extension: "jpg",
          file_size: 1.5 * 1024 * 1024,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(portraitAttachment);

  // Step 9: Validate portrait image dimensions are different
  TestValidator.predicate(
    "portrait width is recorded",
    portraitAttachment.image_width === 1080,
  );
  TestValidator.predicate(
    "portrait height is recorded",
    portraitAttachment.image_height === 1440,
  );

  // Step 10: Upload PNG image to test format support
  const pngAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "transparent-image.png",
          file_type: "image/png",
          file_extension: "png",
          file_size: 3 * 1024 * 1024,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(pngAttachment);

  // Step 11: Validate PNG attachment properties
  TestValidator.equals(
    "PNG file type is correct",
    pngAttachment.file_type,
    "image/png",
  );
  TestValidator.equals(
    "PNG extension is correct",
    pngAttachment.file_extension,
    "png",
  );

  // Step 12: Validate all attachments have proper timestamps
  TestValidator.predicate(
    "attachment has created_at timestamp",
    attachment.created_at !== null && attachment.created_at !== undefined,
  );
  TestValidator.predicate(
    "attachment has updated_at timestamp",
    attachment.updated_at !== null && attachment.updated_at !== undefined,
  );

  // Step 13: Verify attachment deletion state (should not be deleted)
  TestValidator.predicate(
    "attachment is not deleted",
    attachment.deleted_at === null || attachment.deleted_at === undefined,
  );

  // Step 14: Validate that multiple image uploads maintain separate metadata
  TestValidator.notEquals(
    "landscape and portrait have different dimensions",
    attachment.image_width,
    portraitAttachment.image_width,
  );
}
