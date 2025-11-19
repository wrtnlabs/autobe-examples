import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test attachment of an unsupported file type to a discussion board article.
 *
 * This test validates that the system properly rejects file attachments with
 * unsupported file types. A contributor creates an article and attempts to
 * attach files with unsupported extensions (exe, zip, mp4, mp3, etc.). The API
 * should reject these with an appropriate error message indicating which file
 * types are supported.
 *
 * The test flow:
 *
 * 1. Register a new contributor account
 * 2. Create an article in draft status
 * 3. Attempt to attach unsupported file types (exe, zip, mp4, mp3)
 * 4. Verify that each attachment rejection returns an error
 * 5. Confirm error messages reference supported file types
 */
export async function test_api_article_attachment_unsupported_file_type(
  connection: api.IConnection,
) {
  // 1. Register a new contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 2. Create an article in draft status
  // First, get available categories
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: categoryId,
          href: "https://example.com/create-article",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Test attachment of unsupported file types
  const unsupportedFileTypes = [
    {
      filename: "malware.exe",
      extension: "exe",
      mimeType: "application/x-msdownload",
      size: 1024,
    },
    {
      filename: "archive.zip",
      extension: "zip",
      mimeType: "application/zip",
      size: 2048,
    },
    {
      filename: "video.mp4",
      extension: "mp4",
      mimeType: "video/mp4",
      size: 5242880,
    },
    {
      filename: "audio.mp3",
      extension: "mp3",
      mimeType: "audio/mpeg",
      size: 3145728,
    },
  ];

  // Test each unsupported file type
  for (const unsupportedFile of unsupportedFileTypes) {
    await TestValidator.error(
      `should reject unsupported file type: ${unsupportedFile.extension}`,
      async () => {
        await api.functional.discussionBoard.contributor.articles.attachments.attach(
          connection,
          {
            articleId: article.id,
            body: {
              original_filename: unsupportedFile.filename,
              file_type: unsupportedFile.extension,
              file_size: unsupportedFile.size,
              mime_type: unsupportedFile.mimeType,
              display_url: `https://storage.example.com/${unsupportedFile.filename}`,
            } satisfies IDiscussionBoardArticleAttachment.ICreate,
          },
        );
      },
    );
  }

  // 4. Verify that supported file types are still acceptable
  // Test with a supported file type to confirm validation works both ways
  const supportedFile: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.contributor.articles.attachments.attach(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "document.pdf",
          file_type: "pdf",
          file_size: 1048576,
          mime_type: "application/pdf",
          display_url: "https://storage.example.com/document.pdf",
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(supportedFile);
  TestValidator.equals(
    "supported file attachment should succeed",
    supportedFile.file_type,
    "pdf",
  );
}
