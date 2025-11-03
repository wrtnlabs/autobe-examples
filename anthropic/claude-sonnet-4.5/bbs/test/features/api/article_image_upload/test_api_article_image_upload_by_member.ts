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
 * Test the complete workflow of a member uploading an image attachment to their
 * own article.
 *
 * This test validates the image upload functionality by following a complete
 * user journey:
 *
 * 1. Create a moderator account for category management
 * 2. Authenticate as moderator and create a category
 * 3. Create a new member account through registration
 * 4. Create an article as the member
 * 5. Upload an image to the created article with valid metadata
 *
 * Validates that the image is properly uploaded, associated with the article,
 * and contains correct metadata including uploader information.
 */
export async function test_api_article_image_upload_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorPassword = "ModeratorPass456!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://example.com/moderator/register",
        referrer: "https://example.com/admin",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a category as moderator (required for article creation)
  const categoryName = `Test Category ${RandomGenerator.alphaNumeric(6)}`;
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: "Test category for article image upload testing",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a new member account (this switches authentication to member)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberPassword = "SecurePass123!";

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 4: Create an article as the member
  const articleTitle = `Test Article ${RandomGenerator.alphaNumeric(8)}`;
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Upload an image to the created article
  const imageUrl = "https://example.com/images/test-image.jpg";
  const originalFilename = "economic-chart-2024.jpg";
  const imageMimeType = "image/jpeg";
  const imageWidth = 1920;
  const imageHeight = 1080;
  const imageSizeBytes = 512000;

  const uploadedImage: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: {
          url: imageUrl,
          original_name: originalFilename,
          mime_type: imageMimeType,
          size_bytes: imageSizeBytes,
          width: imageWidth,
          height: imageHeight,
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(uploadedImage);

  // Validate the uploaded image details
  TestValidator.equals(
    "image article ID matches",
    uploadedImage.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "image uploader ID matches member",
    uploadedImage.uploaded_by_member_id,
    member.id,
  );
  TestValidator.equals(
    "image original name preserved",
    uploadedImage.original_name,
    originalFilename,
  );
  TestValidator.equals(
    "image MIME type correct",
    uploadedImage.mime_type,
    imageMimeType,
  );
  TestValidator.equals(
    "image size bytes correct",
    uploadedImage.size_bytes,
    imageSizeBytes,
  );
  TestValidator.equals("image width correct", uploadedImage.width, imageWidth);
  TestValidator.equals(
    "image height correct",
    uploadedImage.height,
    imageHeight,
  );
  TestValidator.equals("image URL preserved", uploadedImage.url, imageUrl);
  TestValidator.predicate(
    "image has valid ID",
    uploadedImage.id !== undefined && uploadedImage.id.length > 0,
  );
  TestValidator.predicate(
    "image has creation timestamp",
    uploadedImage.created_at !== undefined,
  );
  TestValidator.predicate(
    "uploader information present",
    uploadedImage.uploader !== undefined,
  );
  TestValidator.equals(
    "uploader username matches",
    uploadedImage.uploader.username,
    memberUsername,
  );
}
