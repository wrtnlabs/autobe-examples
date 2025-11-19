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

export async function test_api_comment_attachment_mime_type_validation(
  connection: api.IConnection,
) {
  // 1. Register a new contributor account for secure attachment testing
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPass123!@#",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 2. Create an article as context for comments
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: "550e8400-e29b-41d4-a716-446655440000",
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Create a comment on the article for attachment validation testing
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

  // 4. Test valid MIME type attachment - image/jpeg with .jpg extension
  // This validates that properly matched MIME types and extensions are accepted
  const jpegAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "valid_image.jpg",
          file_type: "jpg",
          file_size: 2048000,
          mime_type: "image/jpeg",
          display_url: "https://example.com/images/valid_image.jpg",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(jpegAttachment);
  TestValidator.equals(
    "JPEG attachment MIME type is correct",
    jpegAttachment.mime_type,
    "image/jpeg",
  );
  TestValidator.equals(
    "JPEG attachment file type matches",
    jpegAttachment.file_type,
    "jpg",
  );

  // 5. Test valid MIME type attachment - image/png with .png extension
  // Validates that PNG format with correct MIME type is accepted
  const pngAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "valid_image.png",
          file_type: "png",
          file_size: 1536000,
          mime_type: "image/png",
          display_url: "https://example.com/images/valid_image.png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(pngAttachment);
  TestValidator.equals(
    "PNG attachment MIME type is correct",
    pngAttachment.mime_type,
    "image/png",
  );
  TestValidator.equals(
    "PNG attachment file type matches",
    pngAttachment.file_type,
    "png",
  );

  // 6. Test valid MIME type attachment - image/gif with .gif extension
  // Validates that GIF format with correct MIME type is accepted
  const gifAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.create(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          original_file_name: "valid_image.gif",
          file_type: "gif",
          file_size: 1024000,
          mime_type: "image/gif",
          display_url: "https://example.com/images/valid_image.gif",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(gifAttachment);
  TestValidator.equals(
    "GIF attachment MIME type is correct",
    gifAttachment.mime_type,
    "image/gif",
  );
  TestValidator.equals(
    "GIF attachment file type matches",
    gifAttachment.file_type,
    "gif",
  );
}
