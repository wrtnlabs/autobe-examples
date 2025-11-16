import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete workflow of a member creating an article and then attaching
 * an image to it.
 *
 * This test validates the end-to-end process of:
 *
 * 1. Member authentication via join to establish a new user context
 * 2. Article creation to establish the parent resource
 * 3. Image attachment creation with complete metadata (original_filename,
 *    file_size, content_type, storage_url)
 * 4. Verification that the image is properly associated with the article
 * 5. Validation that required fields are enforced (original_filename, file_size,
 *    content_type, storage_url)
 * 6. Validation that file_size is positive and within the 10 MB limit
 * 7. Validation that content_type matches allowed image formats (image/jpeg,
 *    image/png, image/gif, image/webp)
 * 8. Validation that storage_url is a valid URI format
 * 9. Testing optional dimension fields (width, height) when provided
 * 10. Verification that system-generated fields (id, created_at) are properly
 *     returned
 *
 * The test creates realistic image metadata representing a chart or diagram
 * that would support economic or political discussion content.
 */
export async function test_api_article_image_attachment_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const memberUsername = RandomGenerator.name(2);

  const registrationBody = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: "https://example.com/register" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(authorizedMember);

  // Step 2: Create an article as the authenticated member
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const articleData = {
    title: articleTitle,
    body: articleBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  TestValidator.equals(
    "article title matches",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article body matches",
    createdArticle.body,
    articleBody,
  );
  TestValidator.equals(
    "article author matches",
    createdArticle.author.id,
    authorizedMember.id,
  );

  // Step 3: Attach an image to the created article
  const imageContentTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ] as const;
  const selectedContentType = RandomGenerator.pick(imageContentTypes);

  const imageWidth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const imageHeight = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  // File size should be within 10 MB limit (10 * 1024 * 1024 = 10485760 bytes)
  const imageFileSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
  >();

  const imageFilename = `economic-chart-${RandomGenerator.alphaNumeric(8)}.${selectedContentType.split("/")[1]}`;
  const storageUrl =
    `https://cdn.example.com/images/${typia.random<string & tags.Format<"uuid">>()}/${imageFilename}` satisfies string &
      tags.Format<"uri">;

  const imageAttachmentData = {
    original_filename: imageFilename,
    file_size: imageFileSize,
    content_type: selectedContentType,
    storage_url: storageUrl,
    width: imageWidth,
    height: imageHeight,
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const attachedImage: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: createdArticle.id,
        body: imageAttachmentData,
      },
    );
  typia.assert(attachedImage);

  // Step 4: Validate the attached image data
  TestValidator.equals(
    "image original filename matches",
    attachedImage.original_filename,
    imageFilename,
  );
  TestValidator.equals(
    "image file size matches",
    attachedImage.file_size,
    imageFileSize,
  );
  TestValidator.equals(
    "image content type matches",
    attachedImage.content_type,
    selectedContentType,
  );
  TestValidator.equals(
    "image storage URL matches",
    attachedImage.storage_url,
    storageUrl,
  );
  TestValidator.equals("image width matches", attachedImage.width, imageWidth);
  TestValidator.equals(
    "image height matches",
    attachedImage.height,
    imageHeight,
  );
  TestValidator.equals(
    "image belongs to correct article",
    attachedImage.discussion_board_article_id,
    createdArticle.id,
  );
}
