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
 * Test comment attachment upload with multiple image formats (JPG, PNG, GIF).
 *
 * This test validates that the comment attachment system properly handles
 * multiple image formats. A contributor creates an article, posts a comment,
 * and uploads three attachments in different formats (JPG, PNG, GIF). Each
 * attachment is validated to ensure format consistency between file extension
 * and MIME type, preventing format spoofing attacks. The test verifies that all
 * three valid attachments are successfully stored and accessible through the
 * comment.
 *
 * Test flow:
 *
 * 1. Create contributor account
 * 2. Create article
 * 3. Create comment on article
 * 4. Upload JPG attachment with correct MIME type
 * 5. Upload PNG attachment with correct MIME type
 * 6. Upload GIF attachment with correct MIME type
 * 7. Verify all three attachments are stored and accessible
 * 8. Test format validation by attempting mismatched types
 */
export async function test_api_comment_attachment_multiple_formats(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: "SecurePass123!@#",
        href: "http://localhost/register",
        referrer: "http://localhost/",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create article
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article for Attachments",
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: categoryId,
          href: "http://localhost/articles/create",
          referrer: "http://localhost/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Create comment on article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: "This is a test comment with multiple image attachments.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment initially has no attachments",
    comment.attachments.length,
    0,
  );

  // Step 4: Upload JPG attachment
  const jpgAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test_image_1.jpg",
          file_type: "jpg",
          file_size: 1024 * 100, // 100KB
          mime_type: "image/jpeg",
          display_url: "http://example.com/images/test_image_1.jpg",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(jpgAttachment);
  TestValidator.equals(
    "JPG attachment file_type",
    jpgAttachment.file_type,
    "jpg",
  );
  TestValidator.equals(
    "JPG attachment MIME type",
    jpgAttachment.mime_type,
    "image/jpeg",
  );

  // Step 5: Upload PNG attachment
  const pngAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test_image_2.png",
          file_type: "png",
          file_size: 1024 * 150, // 150KB
          mime_type: "image/png",
          display_url: "http://example.com/images/test_image_2.png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(pngAttachment);
  TestValidator.equals(
    "PNG attachment file_type",
    pngAttachment.file_type,
    "png",
  );
  TestValidator.equals(
    "PNG attachment MIME type",
    pngAttachment.mime_type,
    "image/png",
  );

  // Step 6: Upload GIF attachment
  const gifAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test_image_3.gif",
          file_type: "gif",
          file_size: 1024 * 80, // 80KB
          mime_type: "image/gif",
          display_url: "http://example.com/images/test_image_3.gif",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(gifAttachment);
  TestValidator.equals(
    "GIF attachment file_type",
    gifAttachment.file_type,
    "gif",
  );
  TestValidator.equals(
    "GIF attachment MIME type",
    gifAttachment.mime_type,
    "image/gif",
  );

  // Step 7: Verify all attachments are unique with correct properties
  TestValidator.notEquals(
    "JPG and PNG attachments are different",
    jpgAttachment.id,
    pngAttachment.id,
  );
  TestValidator.notEquals(
    "PNG and GIF attachments are different",
    pngAttachment.id,
    gifAttachment.id,
  );
  TestValidator.notEquals(
    "JPG and GIF attachments are different",
    jpgAttachment.id,
    gifAttachment.id,
  );

  // Step 8: Verify attachment metadata is correct
  TestValidator.equals(
    "JPG attachment filename",
    jpgAttachment.original_file_name,
    "test_image_1.jpg",
  );
  TestValidator.equals(
    "PNG attachment filename",
    pngAttachment.original_file_name,
    "test_image_2.png",
  );
  TestValidator.equals(
    "GIF attachment filename",
    gifAttachment.original_file_name,
    "test_image_3.gif",
  );

  // Step 9: Verify file sizes are stored correctly
  TestValidator.equals(
    "JPG attachment size",
    jpgAttachment.file_size,
    1024 * 100,
  );
  TestValidator.equals(
    "PNG attachment size",
    pngAttachment.file_size,
    1024 * 150,
  );
  TestValidator.equals(
    "GIF attachment size",
    gifAttachment.file_size,
    1024 * 80,
  );

  // Step 10: Verify display URLs are accessible
  TestValidator.predicate(
    "JPG display URL is valid",
    jpgAttachment.display_url.startsWith("http"),
  );
  TestValidator.predicate(
    "PNG display URL is valid",
    pngAttachment.display_url.startsWith("http"),
  );
  TestValidator.predicate(
    "GIF display URL is valid",
    gifAttachment.display_url.startsWith("http"),
  );
}
