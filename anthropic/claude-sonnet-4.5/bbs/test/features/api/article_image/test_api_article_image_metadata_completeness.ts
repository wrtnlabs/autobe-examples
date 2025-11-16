import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that all image metadata fields are correctly populated and returned when
 * retrieving an image attachment.
 *
 * This test validates comprehensive metadata capture for discussion board
 * article images. It ensures the system properly captures and preserves all
 * image metadata including file properties, dimensions, and timestamps for
 * display optimization and file management.
 *
 * Test workflow:
 *
 * 1. Create a member account for authentication
 * 2. Create a parent article for image attachment
 * 3. Upload an image with complete metadata (filename, size, type, URL,
 *    dimensions)
 * 4. Retrieve the image and verify all metadata fields are accurate
 * 5. Validate field correctness: filename matches, size matches, type matches, URL
 *    matches, dimensions match, and deleted_at is null for active images
 */
export async function test_api_article_image_metadata_completeness(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "securePassword123";
  const memberUsername = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create parent article for image attachment
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Upload image with complete metadata
  const imageFilename = `test-image-${RandomGenerator.alphaNumeric(8)}.png`;
  const imageFileSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const imageContentType = "image/png";
  const imageStorageUrl = typia.random<string & tags.Format<"uri">>();
  const imageWidth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5000>
  >();
  const imageHeight = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5000>
  >();

  const uploadedImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: imageFilename,
          file_size: imageFileSize,
          content_type: imageContentType,
          storage_url: imageStorageUrl,
          width: imageWidth,
          height: imageHeight,
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(uploadedImage);

  // Step 4: Retrieve the uploaded image
  const retrievedImage =
    await api.functional.discussionBoard.articles.images.at(connection, {
      articleId: article.id,
      imageId: uploadedImage.id,
    });
  typia.assert(retrievedImage);

  // Step 5: Validate all metadata fields are present and accurate
  TestValidator.equals(
    "original filename matches upload",
    retrievedImage.original_filename,
    imageFilename,
  );
  TestValidator.equals(
    "file size matches upload",
    retrievedImage.file_size,
    imageFileSize,
  );
  TestValidator.equals(
    "content type matches upload",
    retrievedImage.content_type,
    imageContentType,
  );
  TestValidator.equals(
    "storage URL matches upload",
    retrievedImage.storage_url,
    imageStorageUrl,
  );
  TestValidator.equals(
    "width matches upload",
    retrievedImage.width,
    imageWidth,
  );
  TestValidator.equals(
    "height matches upload",
    retrievedImage.height,
    imageHeight,
  );
  TestValidator.equals(
    "deleted_at is null for active images",
    retrievedImage.deleted_at,
    null,
  );
}
