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
 * Test successful attachment of a single document file to an article.
 *
 * This test validates the complete workflow of attaching a document to a
 * discussion board article:
 *
 * 1. Register a new contributor account
 * 2. Create a new article as the contributor
 * 3. Attach a single valid document file to the article
 * 4. Validate that the attachment metadata is correctly stored and linked to the
 *    article
 *
 * The test ensures that:
 *
 * - Document attachments are properly stored with correct metadata
 * - Original filename, file type, size, MIME type, and display URL are preserved
 * - The attachment is correctly linked to the parent article
 * - File size limits are respected (documents up to 25MB)
 * - The document is returned with the correct structure and properties
 */
export async function test_api_article_attachment_single_document_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.name(1),
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor email matches",
    contributor.email,
    contributorEmail,
  );

  // Step 2: Create a new article as the contributor
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  // Create a valid category ID (using random UUID format)
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          href: "https://example.com/create-article",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals("article status is draft", article.status, "draft");
  TestValidator.equals(
    "article author matches contributor",
    article.author.id,
    contributor.id,
  );

  // Step 3: Attach a single document file to the article
  // Create a valid document attachment with realistic metadata
  const documentFileName = "test_document.pdf";
  const documentFileType = "pdf";
  const documentFileSize = 512 * 1024; // 512 KB file size (well within 25MB limit)
  const documentMimeType = "application/pdf";
  const documentDisplayUrl =
    "https://storage.example.com/attachments/test_document.pdf";

  const attachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.contributor.articles.attachments.attach(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: documentFileName,
          file_type: documentFileType,
          file_size: documentFileSize,
          mime_type: documentMimeType,
          display_url: documentDisplayUrl,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 4: Validate attachment metadata and linkage
  TestValidator.equals(
    "attachment original filename matches",
    attachment.original_filename,
    documentFileName,
  );
  TestValidator.equals(
    "attachment file type matches",
    attachment.file_type,
    documentFileType,
  );
  TestValidator.equals(
    "attachment file size matches",
    attachment.file_size,
    documentFileSize,
  );
  TestValidator.equals(
    "attachment MIME type matches",
    attachment.mime_type,
    documentMimeType,
  );
  TestValidator.equals(
    "attachment display URL matches",
    attachment.display_url,
    documentDisplayUrl,
  );
  TestValidator.equals(
    "attachment is linked to article",
    attachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "attachment uploader is contributor",
    attachment.uploaded_by_contributor.id,
    contributor.id,
  );
  TestValidator.predicate(
    "file size is within acceptable limit",
    attachment.file_size > 0 && attachment.file_size <= 26214400,
  );
}
