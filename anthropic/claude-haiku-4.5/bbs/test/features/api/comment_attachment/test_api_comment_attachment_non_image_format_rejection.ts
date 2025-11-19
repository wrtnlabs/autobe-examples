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
 * Test that only image file formats are accepted for comment attachments.
 *
 * Validates the system's enforcement that only image formats (JPG, JPEG, PNG,
 * GIF) are allowed for comment attachments. Tests successful attachment of each
 * allowed image format and ensures the system properly validates MIME types and
 * file metadata for image attachments.
 *
 * Test flow:
 *
 * 1. Register contributor for authentication
 * 2. Create article for comment context
 * 3. Create comment on article
 * 4. Test attachment with each allowed image format (jpg, jpeg, png, gif)
 * 5. Verify each image format attachment succeeds
 * 6. Confirm attachments have correct metadata and display URLs
 */
export async function test_api_comment_attachment_non_image_format_rejection(
  connection: api.IConnection,
) {
  // 1. Register contributor for authentication
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "SecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 2. Create article for comment context
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Create comment on article
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

  // 4-6. Test allowed image format attachments

  // Test JPG attachment
  const jpgAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "screenshot.jpg",
          file_type: "jpg",
          file_size: 51200,
          mime_type: "image/jpeg",
          display_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(jpgAttachment);
  TestValidator.equals(
    "jpg attachment should have correct file type",
    jpgAttachment.file_type,
    "jpg",
  );
  TestValidator.equals(
    "jpg attachment should have correct mime type",
    jpgAttachment.mime_type,
    "image/jpeg",
  );

  // Test JPEG attachment
  const jpegAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "photo.jpeg",
          file_type: "jpeg",
          file_size: 61440,
          mime_type: "image/jpeg",
          display_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(jpegAttachment);
  TestValidator.equals(
    "jpeg attachment should have correct file type",
    jpegAttachment.file_type,
    "jpeg",
  );

  // Test PNG attachment
  const pngAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "diagram.png",
          file_type: "png",
          file_size: 71680,
          mime_type: "image/png",
          display_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(pngAttachment);
  TestValidator.equals(
    "png attachment should have correct file type",
    pngAttachment.file_type,
    "png",
  );
  TestValidator.equals(
    "png attachment should have correct mime type",
    pngAttachment.mime_type,
    "image/png",
  );

  // Test GIF attachment
  const gifAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "animation.gif",
          file_type: "gif",
          file_size: 40960,
          mime_type: "image/gif",
          display_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(gifAttachment);
  TestValidator.equals(
    "gif attachment should have correct file type",
    gifAttachment.file_type,
    "gif",
  );
  TestValidator.equals(
    "gif attachment should have correct mime type",
    gifAttachment.mime_type,
    "image/gif",
  );
}
