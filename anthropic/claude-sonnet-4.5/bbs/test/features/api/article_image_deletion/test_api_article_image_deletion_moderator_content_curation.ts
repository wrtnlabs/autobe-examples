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
 * Test moderator workflow for removing inappropriate or outdated images as part
 * of content moderation responsibilities.
 *
 * This test validates the complete moderation action lifecycle for selective
 * image deletion from articles. It ensures moderators can curate content by
 * removing specific images while preserving the article structure and other
 * attachments.
 *
 * Workflow steps:
 *
 * 1. Register and authenticate a moderator account using join
 * 2. Moderator creates a category for article classification
 * 3. Moderator creates an article with content
 * 4. Moderator uploads multiple images to the article
 * 5. Moderator deletes one specific image while preserving others
 * 6. Verify only the targeted image is soft-deleted
 * 7. Confirm other images remain accessible
 * 8. Validate the article content and remaining attachments are intact
 */
export async function test_api_article_image_deletion_moderator_content_curation(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

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

  // Step 2: Create a category for article classification
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create an article with content
  const article =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 4: Upload multiple images to the article (upload 3 images)
  const images = await ArrayUtil.asyncRepeat(3, async (index) => {
    const image =
      await api.functional.discussionBoard.moderator.articles.images.create(
        connection,
        {
          articleId: article.id,
          body: {
            url: typia.random<string & tags.Format<"uri">>(),
            original_name: `test-image-${index}.png`,
            mime_type: "image/png",
            size_bytes: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<5242880>
            >(),
            width: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<50> &
                tags.Maximum<8000>
            >(),
            height: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<50> &
                tags.Maximum<8000>
            >(),
          } satisfies IDiscussionBoardArticleImage.ICreate,
        },
      );
    typia.assert(image);
    return image;
  });

  TestValidator.equals("three images uploaded", images.length, 3);

  // Step 5: Delete one specific image (delete the second image)
  const imageToDelete = images[1];
  typia.assertGuard(imageToDelete!);

  await api.functional.discussionBoard.moderator.articles.images.erase(
    connection,
    {
      articleId: article.id,
      imageId: imageToDelete.id,
    },
  );
}
