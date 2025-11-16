import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_article_image_various_content_types(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123";
  const memberUsername = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a discussion board article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Testing Multiple Image Formats in Articles",
        body: "This article tests the support for various image content types including JPEG, PNG, GIF, and WebP formats.",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Define image content types to test
  const contentTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ] as const;

  const extensions = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
  };

  // Step 4: Upload images with different content types
  const uploadedImages: IDiscussionBoardArticleImage[] = [];

  for (const contentType of contentTypes) {
    const extension = extensions[contentType];
    const imageData = {
      original_filename: `test_image_${RandomGenerator.alphabets(6)}${extension}`,
      file_size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5000000>
      >(),
      content_type: contentType,
      storage_url: typia.random<string & tags.Format<"uri">>(),
      width: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
      >(),
      height: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
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

  // Step 5: Retrieve each image and verify content type preservation
  for (let i = 0; i < uploadedImages.length; i++) {
    const uploadedImage = uploadedImages[i];
    const expectedContentType = contentTypes[i];

    const retrievedImage =
      await api.functional.discussionBoard.articles.images.at(connection, {
        articleId: article.id,
        imageId: uploadedImage.id,
      });
    typia.assert(retrievedImage);

    // Validate content type matches
    TestValidator.equals(
      `image ${i + 1} content type should be ${expectedContentType}`,
      retrievedImage.content_type,
      expectedContentType,
    );

    // Validate other metadata is preserved
    TestValidator.equals(
      `image ${i + 1} ID matches`,
      retrievedImage.id,
      uploadedImage.id,
    );
    TestValidator.equals(
      `image ${i + 1} filename matches`,
      retrievedImage.original_filename,
      uploadedImage.original_filename,
    );
    TestValidator.equals(
      `image ${i + 1} file size matches`,
      retrievedImage.file_size,
      uploadedImage.file_size,
    );
    TestValidator.equals(
      `image ${i + 1} storage URL matches`,
      retrievedImage.storage_url,
      uploadedImage.storage_url,
    );
    TestValidator.equals(
      `image ${i + 1} width matches`,
      retrievedImage.width,
      uploadedImage.width,
    );
    TestValidator.equals(
      `image ${i + 1} height matches`,
      retrievedImage.height,
      uploadedImage.height,
    );
  }

  // Validate all four content types were tested
  TestValidator.equals(
    "all four image formats were tested",
    uploadedImages.length,
    4,
  );
}
