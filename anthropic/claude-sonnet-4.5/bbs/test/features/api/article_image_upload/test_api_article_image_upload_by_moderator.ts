import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test the complete workflow of a moderator uploading an image attachment to an
 * article.
 *
 * This scenario validates that moderators can add images to articles as part of
 * their content management responsibilities. The workflow demonstrates the
 * complete process from moderator registration through article creation to
 * image attachment upload.
 *
 * Workflow steps:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Create a category for article organization
 * 3. Create an article using moderator privileges
 * 4. Upload an image file to the created article with valid metadata
 *
 * Validation points:
 *
 * - Moderator authentication succeeds and returns valid tokens
 * - Category creation succeeds with proper metadata
 * - Article creation succeeds with all required fields
 * - Image upload succeeds with complete metadata (filename, MIME type,
 *   dimensions, size)
 * - Image is properly associated with the article
 */
export async function test_api_article_image_upload_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorPassword = RandomGenerator.alphaNumeric(16);

  const moderator = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderator,
    });
  typia.assert(authenticatedModerator);

  // Step 2: Create a category for article organization
  const categoryName = RandomGenerator.name(2);
  const categoryDescription = RandomGenerator.paragraph({ sentences: 5 });

  const category = {
    name: categoryName,
    description: categoryDescription,
  } satisfies IDiscussionBoardCategory.ICreate;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: category,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Create an article using moderator privileges
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });
  const articleSummary = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  const article = {
    title: articleTitle,
    body: articleBody,
    summary: articleSummary,
    category_ids: [createdCategory.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: article,
    });
  typia.assert(createdArticle);

  // Step 4: Upload an image file to the created article with valid metadata
  const imageUrl = typia.random<string & tags.Format<"uri">>();
  const imageOriginalName = `${RandomGenerator.alphaNumeric(8)}.png`;
  const imageMimeType = "image/png";
  const imageSizeBytes = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5242880>
  >();
  const imageWidth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
  >();
  const imageHeight = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
  >();

  const imageData = {
    url: imageUrl,
    original_name: imageOriginalName,
    mime_type: imageMimeType,
    size_bytes: imageSizeBytes,
    width: imageWidth,
    height: imageHeight,
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const uploadedImage: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.moderator.articles.images.create(
      connection,
      {
        articleId: createdArticle.id,
        body: imageData,
      },
    );
  typia.assert(uploadedImage);

  // Validate the uploaded image metadata
  TestValidator.equals("image URL matches", uploadedImage.url, imageUrl);
  TestValidator.equals(
    "original filename matches",
    uploadedImage.original_name,
    imageOriginalName,
  );
  TestValidator.equals(
    "MIME type matches",
    uploadedImage.mime_type,
    imageMimeType,
  );
  TestValidator.equals(
    "file size matches",
    uploadedImage.size_bytes,
    imageSizeBytes,
  );
  TestValidator.equals("image width matches", uploadedImage.width, imageWidth);
  TestValidator.equals(
    "image height matches",
    uploadedImage.height,
    imageHeight,
  );
  TestValidator.equals(
    "image belongs to article",
    uploadedImage.discussion_board_article_id,
    createdArticle.id,
  );
}
