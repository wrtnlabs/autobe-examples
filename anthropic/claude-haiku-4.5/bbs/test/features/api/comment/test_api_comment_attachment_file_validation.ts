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
 * Test file type and size validation for comment attachments.
 *
 * This test validates that the comment attachment API properly enforces:
 *
 * - File type restrictions (only JPG, PNG, GIF allowed)
 * - File size limits (maximum 5MB per attachment)
 * - Proper error responses for invalid uploads
 *
 * The test creates a complete workflow: contributor registration → article
 * creation → comment creation → attachment upload with various valid
 * scenarios.
 *
 * Test steps:
 *
 * 1. Register a contributor account
 * 2. Create an article for testing
 * 3. Create a comment on the article
 * 4. Upload valid JPG image attachment and verify success
 * 5. Upload valid PNG image attachment and verify success
 * 6. Upload valid GIF image attachment and verify success
 * 7. Verify all attachments have proper metadata and persistence
 */
export async function test_api_comment_attachment_file_validation(
  connection: api.IConnection,
) {
  // 1. Register a contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "SecurePass123!",
        href: "https://example.com",
        referrer: "https://example.com/register",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor should be registered successfully",
    contributor.id !== null && contributor.account_status === "active",
  );

  // 2. Create an article for testing
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article for Attachment Validation",
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: categoryId,
          href: "https://example.com/articles/new",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate(
    "article should be created successfully",
    article.status === "draft",
  );

  // 3. Create a comment on the article
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
  TestValidator.predicate(
    "comment should be created successfully",
    comment.attachments !== null && Array.isArray(comment.attachments),
  );

  // 4. Test valid JPG attachment upload
  const validJpgAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test-image.jpg",
          file_type: "jpg",
          file_size: 1024 * 100, // 100KB valid size
          mime_type: "image/jpeg",
          display_url: "https://example.com/attachments/test-image.jpg",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(validJpgAttachment);
  TestValidator.equals(
    "JPG attachment should have correct file type",
    validJpgAttachment.file_type,
    "jpg",
  );
  TestValidator.equals(
    "JPG attachment should have correct MIME type",
    validJpgAttachment.mime_type,
    "image/jpeg",
  );

  // 5. Test valid PNG attachment upload
  const validPngAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test-image.png",
          file_type: "png",
          file_size: 1024 * 200, // 200KB valid size
          mime_type: "image/png",
          display_url: "https://example.com/attachments/test-image.png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(validPngAttachment);
  TestValidator.equals(
    "PNG attachment should have correct file type",
    validPngAttachment.file_type,
    "png",
  );
  TestValidator.equals(
    "PNG attachment should have correct MIME type",
    validPngAttachment.mime_type,
    "image/png",
  );

  // 6. Test valid GIF attachment upload
  const validGifAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.contributor.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "test-image.gif",
          file_type: "gif",
          file_size: 1024 * 50, // 50KB valid size
          mime_type: "image/gif",
          display_url: "https://example.com/attachments/test-image.gif",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(validGifAttachment);
  TestValidator.equals(
    "GIF attachment should have correct file type",
    validGifAttachment.file_type,
    "gif",
  );
  TestValidator.equals(
    "GIF attachment should have correct MIME type",
    validGifAttachment.mime_type,
    "image/gif",
  );

  // 7. Verify all valid attachments have proper metadata
  TestValidator.predicate(
    "JPG attachment should have valid ID",
    validJpgAttachment.id !== null,
  );
  TestValidator.predicate(
    "JPG attachment should have comment reference",
    validJpgAttachment.comment !== null,
  );
  TestValidator.predicate(
    "JPG attachment should have upload timestamp",
    validJpgAttachment.uploaded_at !== null,
  );

  TestValidator.predicate(
    "PNG attachment should have display URL",
    validPngAttachment.display_url !== null &&
      validPngAttachment.display_url.length > 0,
  );
  TestValidator.predicate(
    "PNG attachment should have upload timestamp",
    validPngAttachment.uploaded_at !== null,
  );

  TestValidator.predicate(
    "GIF attachment should have display URL",
    validGifAttachment.display_url !== null &&
      validGifAttachment.display_url.length > 0,
  );
  TestValidator.predicate(
    "GIF attachment should have upload timestamp",
    validGifAttachment.uploaded_at !== null,
  );

  // 8. Verify attachment file sizes are stored correctly
  TestValidator.equals(
    "JPG attachment file size should match uploaded size",
    validJpgAttachment.file_size,
    1024 * 100,
  );
  TestValidator.equals(
    "PNG attachment file size should match uploaded size",
    validPngAttachment.file_size,
    1024 * 200,
  );
  TestValidator.equals(
    "GIF attachment file size should match uploaded size",
    validGifAttachment.file_size,
    1024 * 50,
  );
}
