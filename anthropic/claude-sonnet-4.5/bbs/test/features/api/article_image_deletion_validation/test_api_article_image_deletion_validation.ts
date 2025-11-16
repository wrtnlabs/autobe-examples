import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test edge cases and validation scenarios for image deletion endpoint.
 *
 * This test validates the referential integrity and error handling of the image
 * deletion API by attempting various invalid deletion scenarios:
 *
 * 1. Create a member account and authenticate
 * 2. Create two separate articles (articleA and articleB)
 * 3. Attach an image to articleB
 * 4. Attempt to delete image from non-existent article (should fail)
 * 5. Attempt to delete non-existent image from valid article (should fail)
 * 6. Attempt to delete articleB's image using articleA's ID (should fail -
 *    mismatched relationship)
 *
 * All deletion attempts should fail with appropriate error responses,
 * validating that the API correctly enforces referential integrity between
 * articles and images.
 */
export async function test_api_article_image_deletion_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create first article (articleA)
  const articleAData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleA = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: articleAData,
    },
  );
  typia.assert(articleA);

  // Step 3: Create second article (articleB)
  const articleBData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleB = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: articleBData,
    },
  );
  typia.assert(articleB);

  // Step 4: Attach an image to articleB
  const imageData = {
    original_filename: "test-image.png",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type: "image/png",
    storage_url: typia.random<string & tags.Format<"uri">>(),
    width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const image =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: articleB.id,
        body: imageData,
      },
    );
  typia.assert(image);

  // Step 5: Test deletion from non-existent article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail when deleting image from non-existent article",
    async () => {
      await api.functional.discussionBoard.member.articles.images.erase(
        connection,
        {
          articleId: nonExistentArticleId,
          imageId: image.id,
        },
      );
    },
  );

  // Step 6: Test deletion of non-existent image from valid article
  const nonExistentImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail when deleting non-existent image",
    async () => {
      await api.functional.discussionBoard.member.articles.images.erase(
        connection,
        {
          articleId: articleA.id,
          imageId: nonExistentImageId,
        },
      );
    },
  );

  // Step 7: Test deletion of image with mismatched article-image relationship
  // The image belongs to articleB, but we try to delete it using articleA's ID
  await TestValidator.error(
    "should fail when image does not belong to specified article",
    async () => {
      await api.functional.discussionBoard.member.articles.images.erase(
        connection,
        {
          articleId: articleA.id,
          imageId: image.id,
        },
      );
    },
  );
}
