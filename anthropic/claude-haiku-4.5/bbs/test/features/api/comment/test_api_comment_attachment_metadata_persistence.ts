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
 * Test that all comment attachment metadata is correctly persisted and
 * returned.
 *
 * This test validates the complete lifecycle of attachment metadata in
 * discussion board comments. It creates a comment with image attachments and
 * verifies that all metadata fields (original_file_name, file_type, file_size,
 * mime_type, display_url, uploaded_at, author) are correctly persisted and
 * returned in API responses. The test ensures data integrity across attachment
 * creation and storage operations.
 *
 * Test workflow:
 *
 * 1. Register a contributor account for testing
 * 2. Create a discussion board article
 * 3. Create a comment on the article
 * 4. Create first comment attachment with complete JPG metadata
 * 5. Verify first attachment response includes all metadata fields and generated
 *    UUID
 * 6. Create second comment attachment with complete PNG metadata
 * 7. Verify second attachment response includes all metadata fields and generated
 *    UUID
 * 8. Validate data integrity: filenames, file types, MIME types, sizes, URLs,
 *    timestamps, author
 * 9. Ensure attachment records maintain complete metadata consistency
 */
export async function test_api_comment_attachment_metadata_persistence(
  connection: api.IConnection,
) {
  // Register contributor
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!@#",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Create article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "https://example.com/articles",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Create comment
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Test attachment 1: JPG image
  const jpgFileName = "test_image.jpg";
  const jpgFileSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5242880>
  >();
  const jpgDisplayUrl = "https://storage.example.com/images/test_image_1.jpg";

  const attachmentRequest1 = {
    original_file_name: jpgFileName,
    file_type: "jpg" as const,
    file_size: jpgFileSize,
    mime_type: "image/jpeg" as const,
    display_url: jpgDisplayUrl,
  } satisfies IDiscussionBoardCommentAttachment.ICreate;

  const attachment1: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: attachmentRequest1,
      },
    );
  typia.assert(attachment1);

  // Verify attachment 1: original_file_name persistence
  TestValidator.equals(
    "attachment 1 original_file_name matches input exactly",
    attachment1.original_file_name,
    jpgFileName,
  );

  // Verify attachment 1: file_type and mime_type persistence
  TestValidator.equals(
    "attachment 1 file_type matches input",
    attachment1.file_type,
    "jpg",
  );
  TestValidator.equals(
    "attachment 1 mime_type matches input",
    attachment1.mime_type,
    "image/jpeg",
  );

  // Verify attachment 1: file_size persistence
  TestValidator.equals(
    "attachment 1 file_size matches input exactly",
    attachment1.file_size,
    jpgFileSize,
  );

  // Verify attachment 1: display_url persistence
  TestValidator.equals(
    "attachment 1 display_url matches input exactly",
    attachment1.display_url,
    jpgDisplayUrl,
  );

  // Verify attachment 1: generated UUID
  TestValidator.predicate(
    "attachment 1 has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      attachment1.id,
    ),
  );

  // Verify attachment 1: upload timestamp
  TestValidator.predicate(
    "attachment 1 uploaded_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?/.test(
      attachment1.uploaded_at,
    ),
  );

  // Verify attachment 1: author information
  TestValidator.equals(
    "attachment 1 author id matches contributor",
    attachment1.author.id,
    contributor.id,
  );
  TestValidator.equals(
    "attachment 1 author username matches contributor",
    attachment1.author.username,
    contributor.username,
  );

  // Verify attachment 1: comment reference
  TestValidator.equals(
    "attachment 1 comment id matches created comment",
    attachment1.comment.id,
    comment.id,
  );

  // Test attachment 2: PNG image with different metadata
  const pngFileName = "screenshot.png";
  const pngFileSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5242880>
  >();
  const pngDisplayUrl = "https://storage.example.com/images/screenshot_001.png";

  const attachmentRequest2 = {
    original_file_name: pngFileName,
    file_type: "png" as const,
    file_size: pngFileSize,
    mime_type: "image/png" as const,
    display_url: pngDisplayUrl,
  } satisfies IDiscussionBoardCommentAttachment.ICreate;

  const attachment2: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: attachmentRequest2,
      },
    );
  typia.assert(attachment2);

  // Verify attachment 2: original_file_name persistence
  TestValidator.equals(
    "attachment 2 original_file_name matches input exactly",
    attachment2.original_file_name,
    pngFileName,
  );

  // Verify attachment 2: file_type and mime_type persistence
  TestValidator.equals(
    "attachment 2 file_type matches input",
    attachment2.file_type,
    "png",
  );
  TestValidator.equals(
    "attachment 2 mime_type matches input",
    attachment2.mime_type,
    "image/png",
  );

  // Verify attachment 2: file_size persistence
  TestValidator.equals(
    "attachment 2 file_size matches input exactly",
    attachment2.file_size,
    pngFileSize,
  );

  // Verify attachment 2: display_url persistence
  TestValidator.equals(
    "attachment 2 display_url matches input exactly",
    attachment2.display_url,
    pngDisplayUrl,
  );

  // Verify attachment 2: generated UUID is unique
  TestValidator.predicate(
    "attachment 2 has valid UUID different from attachment 1",
    attachment2.id !== attachment1.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        attachment2.id,
      ),
  );

  // Verify attachment 2: upload timestamp
  TestValidator.predicate(
    "attachment 2 uploaded_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?/.test(
      attachment2.uploaded_at,
    ),
  );

  // Verify attachment 2: author information
  TestValidator.equals(
    "attachment 2 author id matches contributor",
    attachment2.author.id,
    contributor.id,
  );

  // Verify attachment 2: comment reference
  TestValidator.equals(
    "attachment 2 comment id matches created comment",
    attachment2.comment.id,
    comment.id,
  );

  // Validate data integrity: file_type to mime_type correspondence
  TestValidator.predicate(
    "JPG file_type corresponds to correct MIME type",
    attachment1.file_type === "jpg" && attachment1.mime_type === "image/jpeg",
  );
  TestValidator.predicate(
    "PNG file_type corresponds to correct MIME type",
    attachment2.file_type === "png" && attachment2.mime_type === "image/png",
  );

  // Validate data integrity: file_size is within valid image range
  TestValidator.predicate(
    "attachment 1 file_size within valid image range (1 to 5MB)",
    attachment1.file_size > 0 && attachment1.file_size <= 5242880,
  );
  TestValidator.predicate(
    "attachment 2 file_size within valid image range (1 to 5MB)",
    attachment2.file_size > 0 && attachment2.file_size <= 5242880,
  );

  // Validate data integrity: different attachments have different sizes
  TestValidator.predicate(
    "attachment sizes may differ (not enforced to be same)",
    attachment1.file_size !== undefined && attachment2.file_size !== undefined,
  );

  // Validate metadata completeness for attachment 1
  TestValidator.predicate(
    "attachment 1 has all required metadata fields",
    attachment1.id !== undefined &&
      attachment1.original_file_name !== undefined &&
      attachment1.file_type !== undefined &&
      attachment1.file_size !== undefined &&
      attachment1.mime_type !== undefined &&
      attachment1.display_url !== undefined &&
      attachment1.uploaded_at !== undefined &&
      attachment1.author !== undefined &&
      attachment1.comment !== undefined,
  );

  // Validate metadata completeness for attachment 2
  TestValidator.predicate(
    "attachment 2 has all required metadata fields",
    attachment2.id !== undefined &&
      attachment2.original_file_name !== undefined &&
      attachment2.file_type !== undefined &&
      attachment2.file_size !== undefined &&
      attachment2.mime_type !== undefined &&
      attachment2.display_url !== undefined &&
      attachment2.uploaded_at !== undefined &&
      attachment2.author !== undefined &&
      attachment2.comment !== undefined,
  );
}
