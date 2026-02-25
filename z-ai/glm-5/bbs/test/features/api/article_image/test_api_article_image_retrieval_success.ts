import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_images_create_image } from "../../../generate/generate_random_discussion_board_user_articles_images_create_image";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test successful retrieval of an image attached to an article.
 *
 * Workflow:
 * 1. User joins the platform and authenticates
 * 2. User creates an article
 * 3. User attaches an image to the article
 * 4. Retrieve the image via GET endpoint
 * 5. Validate the retrieved image metadata matches the attached image
 */
export async function test_api_article_image_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication - create actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Attach an image to the article
  const image =
    await generate_random_discussion_board_user_articles_images_create_image(
      userConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(image);
  // 4. Retrieve the image using the public endpoint
  const retrievedImage =
    await api.functional.discussionBoard.articles.images.at(userConnection, {
      articleId: article.id,
      imageId: image.id,
    });
  typia.assert(retrievedImage);
  // 5. Validate all metadata fields match
  TestValidator.equals("image id", retrievedImage.id, image.id);
  TestValidator.equals(
    "original filename",
    retrievedImage.original_filename,
    image.original_filename,
  );
  TestValidator.equals(
    "storage path",
    retrievedImage.storage_path,
    image.storage_path,
  );
  TestValidator.equals("file size", retrievedImage.file_size, image.file_size);
  TestValidator.equals("mime type", retrievedImage.mime_type, image.mime_type);
  TestValidator.equals("width", retrievedImage.width, image.width);
  TestValidator.equals("height", retrievedImage.height, image.height);
  TestValidator.equals(
    "created at",
    retrievedImage.created_at,
    image.created_at,
  );
  // 6. Validate dimension limits
  TestValidator.predicate("width within limit", retrievedImage.width <= 8000);
  TestValidator.predicate("height within limit", retrievedImage.height <= 8000);
}
