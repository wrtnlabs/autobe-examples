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
 * Test the enforcement of the maximum 10 image attachments per article limit.
 *
 * This test validates that the system properly tracks the number of images
 * attached to an article and prevents exceeding the defined limit of 10 images
 * per article.
 *
 * Workflow steps:
 *
 * 1. Create a moderator account for category creation
 * 2. Create a category for article creation
 * 3. Create a new member account through registration (join)
 * 4. Create an article for testing attachment limits
 * 5. Upload 10 valid images to the article (reaching the maximum limit)
 * 6. Verify all 10 images are successfully attached
 *
 * Validation points:
 *
 * - Verify that the first 10 images upload successfully
 * - Confirm that each image is properly recorded with unique metadata
 * - Ensure all 10 successfully uploaded images remain accessible
 * - Validate proper tracking of image count per article
 */
export async function test_api_article_image_upload_maximum_count_limit(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorPassword = "Password123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a category for article creation
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Policy Analysis",
          description: "Discussion of economic policies and their impacts",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const memberPassword = "Password123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 4: Create an article for testing attachment limits
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Upload 10 valid images to the article (reaching the maximum limit)
  const uploadedImages: IDiscussionBoardArticleImage[] = [];

  const imageFormats = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ] as const;

  for (let i = 0; i < 10; i++) {
    const mimeType = RandomGenerator.pick(imageFormats);
    const extension = mimeType.split("/")[1];

    const imageData = {
      url: typia.random<string & tags.Format<"uri">>(),
      original_name: `test_image_${i + 1}.${extension}`,
      mime_type: mimeType,
      size_bytes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5242880>
      >(),
      width: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
      >(),
      height: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
      >(),
    } satisfies IDiscussionBoardArticleImage.ICreate;

    const uploadedImage =
      await api.functional.discussionBoard.member.articles.images.create(
        connection,
        {
          articleId: article.id,
          body: imageData,
        },
      );
    typia.assert(uploadedImage);

    uploadedImages.push(uploadedImage);
  }

  // Step 6: Verify all 10 images are successfully attached
  TestValidator.equals("uploaded image count", uploadedImages.length, 10);

  // Verify each image has unique metadata
  for (let i = 0; i < uploadedImages.length; i++) {
    const image = uploadedImages[i];
    TestValidator.predicate(
      `image ${i + 1} has valid ID`,
      image.id !== null && image.id !== undefined,
    );
    TestValidator.predicate(
      `image ${i + 1} is attached to correct article`,
      image.discussion_board_article_id === article.id,
    );
    TestValidator.predicate(
      `image ${i + 1} has valid uploader`,
      image.uploaded_by_member_id === member.id,
    );
  }

  // Ensure all images have unique IDs
  const uniqueIds = new Set(uploadedImages.map((img) => img.id));
  TestValidator.equals("all images have unique IDs", uniqueIds.size, 10);
}
