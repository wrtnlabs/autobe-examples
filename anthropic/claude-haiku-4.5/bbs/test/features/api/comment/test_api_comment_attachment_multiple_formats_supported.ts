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
 * Test that comment attachments support all three allowed image formats (JPG,
 * PNG, GIF).
 *
 * Creates separate test cases for each format to validate that the system
 * correctly processes and validates different image file types. Each attachment
 * includes appropriate MIME type (image/jpeg, image/png, image/gif), correct
 * file extension in lowercase, and valid file size. Verifies that
 * format-specific metadata is properly stored and display URLs are generated
 * for each format.
 *
 * Test flow:
 *
 * 1. Register contributor account
 * 2. Create discussion board article
 * 3. Create comment on article
 * 4. Test JPG attachment with proper metadata
 * 5. Test PNG attachment with proper metadata
 * 6. Test GIF attachment with proper metadata
 * 7. Verify all three formats are stored correctly
 * 8. Validate display URLs for each format
 */
export async function test_api_comment_attachment_multiple_formats_supported(
  connection: api.IConnection,
) {
  // Step 1: Register contributor
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "SecurePassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor account created",
    contributor.id !== null && contributor.id !== undefined,
  );

  // Step 2: Create article for comments
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article for Comment Attachments",
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate("article created successfully", article.id !== null);

  // Step 3: Create comment on article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "This comment will have image attachments in multiple formats",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.predicate(
    "comment created successfully",
    comment.id !== null && comment.id !== undefined,
  );

  // Step 4: Test JPG attachment
  const jpgAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test_image.jpg",
          file_type: "jpg",
          file_size: 1024 * 50, // 50KB
          mime_type: "image/jpeg",
          display_url: "https://storage.example.com/images/test_image.jpg",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(jpgAttachment);
  TestValidator.equals(
    "JPG attachment file_type is correct",
    jpgAttachment.file_type,
    "jpg",
  );
  TestValidator.equals(
    "JPG attachment MIME type is correct",
    jpgAttachment.mime_type,
    "image/jpeg",
  );
  TestValidator.predicate(
    "JPG attachment has display URL",
    jpgAttachment.display_url.length > 0,
  );

  // Step 5: Test PNG attachment
  const pngAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test_image.png",
          file_type: "png",
          file_size: 1024 * 75, // 75KB
          mime_type: "image/png",
          display_url: "https://storage.example.com/images/test_image.png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(pngAttachment);
  TestValidator.equals(
    "PNG attachment file_type is correct",
    pngAttachment.file_type,
    "png",
  );
  TestValidator.equals(
    "PNG attachment MIME type is correct",
    pngAttachment.mime_type,
    "image/png",
  );
  TestValidator.predicate(
    "PNG attachment has display URL",
    pngAttachment.display_url.length > 0,
  );

  // Step 6: Test GIF attachment
  const gifAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test_image.gif",
          file_type: "gif",
          file_size: 1024 * 30, // 30KB
          mime_type: "image/gif",
          display_url: "https://storage.example.com/images/test_image.gif",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(gifAttachment);
  TestValidator.equals(
    "GIF attachment file_type is correct",
    gifAttachment.file_type,
    "gif",
  );
  TestValidator.equals(
    "GIF attachment MIME type is correct",
    gifAttachment.mime_type,
    "image/gif",
  );
  TestValidator.predicate(
    "GIF attachment has display URL",
    gifAttachment.display_url.length > 0,
  );

  // Step 7: Verify all attachments are properly stored
  TestValidator.predicate(
    "JPG, PNG, and GIF attachments created successfully",
    jpgAttachment.id !== undefined &&
      pngAttachment.id !== undefined &&
      gifAttachment.id !== undefined,
  );

  // Step 8: Validate file metadata for each format
  TestValidator.equals(
    "JPG file size is recorded correctly",
    jpgAttachment.file_size,
    1024 * 50,
  );
  TestValidator.equals(
    "PNG file size is recorded correctly",
    pngAttachment.file_size,
    1024 * 75,
  );
  TestValidator.equals(
    "GIF file size is recorded correctly",
    gifAttachment.file_size,
    1024 * 30,
  );

  // Step 9: Validate upload timestamps are recorded
  TestValidator.predicate(
    "JPG attachment has upload timestamp",
    jpgAttachment.uploaded_at !== null &&
      jpgAttachment.uploaded_at !== undefined,
  );
  TestValidator.predicate(
    "PNG attachment has upload timestamp",
    pngAttachment.uploaded_at !== null &&
      pngAttachment.uploaded_at !== undefined,
  );
  TestValidator.predicate(
    "GIF attachment has upload timestamp",
    gifAttachment.uploaded_at !== null &&
      gifAttachment.uploaded_at !== undefined,
  );
}
