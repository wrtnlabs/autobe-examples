import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test scenario: Moderator deletes image from their own article using moderator
 * endpoint
 *
 * Business flow:
 *
 * 1. Create a moderator account and authenticate
 * 2. Moderator creates an article (moderators can also create content)
 * 3. Moderator uploads an image to their own article
 * 4. Moderator deletes the image using moderator endpoint
 * 5. Verify the image is soft-deleted (deleted_at is set)
 *
 * This validates that moderators can manage their own content through moderator
 * endpoints, ensuring consistent behavior and proper audit trail tracking.
 */
export async function test_api_article_image_moderator_own_content(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates an article
  const article = await api.functional.discussionBoard.articles.create(
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
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Moderator uploads an image to their own article
  const imageData = {
    original_filename: `test_image_${RandomGenerator.alphaNumeric(8)}.png`,
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    content_type: "image/png",
    storage_url: typia.random<string & tags.Format<"uri">>(),
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const uploadedImage =
    await api.functional.discussionBoard.moderator.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: imageData,
      },
    );
  typia.assert(uploadedImage);

  // Verify image was created successfully
  TestValidator.equals(
    "uploaded image article ID matches",
    uploadedImage.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "uploaded image filename matches",
    uploadedImage.original_filename,
    imageData.original_filename,
  );
  TestValidator.equals(
    "image is not deleted initially",
    uploadedImage.deleted_at,
    null,
  );

  // Step 4: Moderator deletes the image from their own article
  const deletedImage =
    await api.functional.discussionBoard.moderator.articles.images.erase(
      connection,
      {
        articleId: article.id,
        imageId: uploadedImage.id,
      },
    );
  typia.assert(deletedImage);

  // Step 5: Verify soft deletion
  TestValidator.equals(
    "deleted image ID matches original",
    deletedImage.id,
    uploadedImage.id,
  );
  TestValidator.equals(
    "deleted image article ID matches",
    deletedImage.discussion_board_article_id,
    article.id,
  );
  TestValidator.predicate(
    "image has deletion timestamp",
    deletedImage.deleted_at !== null && deletedImage.deleted_at !== undefined,
  );

  // Verify the deletion timestamp is a valid date-time format
  if (deletedImage.deleted_at) {
    typia.assert<string & tags.Format<"date-time">>(deletedImage.deleted_at);
  }
}
