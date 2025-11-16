import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test deletion workflow with multiple image attachments on a single article.
 *
 * This test validates the selective deletion of individual images from a
 * multi-image article. A member creates an article, uploads 4 images, then
 * selectively deletes 2 specific images while leaving the other 2 intact. This
 * validates that soft deletion correctly targets individual images without
 * affecting other attachments on the same article.
 *
 * Workflow:
 *
 * 1. Register and authenticate a new discussion board member
 * 2. Create a discussion board article
 * 3. Upload 4 images to the article
 * 4. Delete 2 specific images (first and third)
 * 5. Verify deleted images have deleted_at timestamps set
 * 6. Verify remaining images (second and fourth) have null deleted_at values
 */
export async function test_api_article_image_deletion_multiple_images(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new member
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create an article to host multiple image attachments
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Upload 4 images to the article
  const uploadedImages: IDiscussionBoardArticleImage[] =
    await ArrayUtil.asyncRepeat(4, async (index) => {
      const imageData = {
        original_filename: `test_image_${index + 1}.png`,
        file_size: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
        >(),
        content_type: "image/png",
        storage_url: typia.random<string & tags.Format<"uri">>(),
        width: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<4096>
        >(),
        height: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<4096>
        >(),
      } satisfies IDiscussionBoardArticleImage.ICreate;

      const image: IDiscussionBoardArticleImage =
        await api.functional.discussionBoard.member.articles.images.create(
          connection,
          {
            articleId: article.id,
            body: imageData,
          },
        );
      typia.assert(image);
      return image;
    });

  TestValidator.equals("uploaded 4 images", uploadedImages.length, 4);

  // Step 4: Selectively delete 2 images (first and third)
  const firstDeletedImage: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.member.articles.images.erase(
      connection,
      {
        articleId: article.id,
        imageId: uploadedImages[0].id,
      },
    );
  typia.assert(firstDeletedImage);

  const thirdDeletedImage: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.member.articles.images.erase(
      connection,
      {
        articleId: article.id,
        imageId: uploadedImages[2].id,
      },
    );
  typia.assert(thirdDeletedImage);

  // Step 5: Verify deleted images have deleted_at timestamps set
  TestValidator.predicate(
    "first deleted image has deleted_at timestamp",
    firstDeletedImage.deleted_at !== null &&
      firstDeletedImage.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "third deleted image has deleted_at timestamp",
    thirdDeletedImage.deleted_at !== null &&
      thirdDeletedImage.deleted_at !== undefined,
  );

  // Step 6: Verify remaining images have null deleted_at values
  TestValidator.equals(
    "second image deleted_at is null",
    uploadedImages[1].deleted_at,
    null,
  );
  TestValidator.equals(
    "fourth image deleted_at is null",
    uploadedImages[3].deleted_at,
    null,
  );
}
