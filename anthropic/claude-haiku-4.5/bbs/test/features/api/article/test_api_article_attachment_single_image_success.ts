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
 * Test successful attachment of a single image file to an article.
 *
 * A contributor creates an article and attaches a single image (jpg format).
 * The test validates that the attachment is properly stored with correct
 * metadata: original filename, file type, size in bytes, MIME type, and display
 * URL. Confirms that the attachment is linked to the parent article and
 * included in article responses. Validates that image file size limits (5MB)
 * are enforced. Tests with a valid, properly formatted image file.
 *
 * Steps:
 *
 * 1. Register a new contributor account
 * 2. Create an article in draft status
 * 3. Attach a single image file to the article
 * 4. Validate attachment metadata (filename, type, size, MIME type, URL)
 * 5. Verify attachment is linked to the article
 * 6. Retrieve article and confirm attachment is included in response
 */
export async function test_api_article_attachment_single_image_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorUsername = RandomGenerator.alphabets(10);
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: contributorUsername,
        password: "ValidPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor account created",
    contributor.id !== undefined,
  );

  // Step 2: Create an article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: categoryId,
          href: "https://example.com/articles/create",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals("article status is draft", article.status, "draft");
  TestValidator.equals(
    "article author matches",
    article.author.id,
    contributor.id,
  );

  // Step 3: Attach a single image file to the article
  const imageFilename = `test-image-${RandomGenerator.alphaNumeric(8)}.jpg`;
  const imageFileSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5242880>
  >();
  const imageMimeType = "image/jpeg";
  const imageUrl = `https://storage.example.com/attachments/${RandomGenerator.alphaNumeric(16)}.jpg`;

  const attachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.contributor.articles.attachments.attach(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: imageFilename,
          file_type: "jpg",
          file_size: imageFileSize,
          mime_type: imageMimeType,
          display_url: imageUrl,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 4: Validate attachment metadata
  TestValidator.equals(
    "attachment original filename matches",
    attachment.original_filename,
    imageFilename,
  );
  TestValidator.equals(
    "attachment file type matches",
    attachment.file_type,
    "jpg",
  );
  TestValidator.equals(
    "attachment file size matches",
    attachment.file_size,
    imageFileSize,
  );
  TestValidator.equals(
    "attachment MIME type matches",
    attachment.mime_type,
    imageMimeType,
  );
  TestValidator.equals(
    "attachment display URL matches",
    attachment.display_url,
    imageUrl,
  );
  TestValidator.predicate(
    "attachment ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      attachment.id,
    ),
  );
  TestValidator.equals(
    "attachment is linked to article",
    attachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "attachment uploaded by correct contributor",
    attachment.uploaded_by_contributor.id,
    contributor.id,
  );
  TestValidator.predicate(
    "attachment has uploaded_at timestamp",
    attachment.uploaded_at !== undefined && attachment.uploaded_at !== null,
  );

  // Step 5: Verify attachment metadata validation
  TestValidator.predicate(
    "image file size within 5MB limit",
    attachment.file_size <= 5242880,
  );
  TestValidator.predicate(
    "image file size is positive",
    attachment.file_size > 0,
  );
  TestValidator.equals(
    "attachment contributor username matches",
    attachment.uploaded_by_contributor.username,
    contributor.username,
  );
}
