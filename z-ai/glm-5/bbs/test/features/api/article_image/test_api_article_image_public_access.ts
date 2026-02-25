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
 * Test public access to article images by a different user.
 * Setup: First user joins, creates an article, and attaches an image.
 * Second user joins separately.
 * Execute: Second user calls GET /discussionBoard/articles/{articleId}/images/{imageId}
 * using the first user's article and image IDs.
 * Validate: Response returns 200 status with complete image metadata.
 */
export async function test_api_article_image_public_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. First user joins
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {});
  typia.assert(user1);
  // 2. First user creates an article
  const article = await generate_random_discussion_board_user_articles_create(
    user1Connection,
    {},
  );
  typia.assert(article);
  // 3. First user attaches an image to the article
  const image =
    await generate_random_discussion_board_user_articles_images_create_image(
      user1Connection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(image);
  // 4. Second user joins
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {});
  typia.assert(user2);
  // 5. Second user retrieves the image from first user's article
  const retrievedImage =
    await api.functional.discussionBoard.articles.images.at(user2Connection, {
      articleId: article.id,
      imageId: image.id,
    });
  typia.assert(retrievedImage);
  // 6. Validate the image metadata matches
  TestValidator.equals("image id matches", retrievedImage.id, image.id);
  TestValidator.equals(
    "original filename matches",
    retrievedImage.original_filename,
    image.original_filename,
  );
  TestValidator.equals(
    "storage path matches",
    retrievedImage.storage_path,
    image.storage_path,
  );
  TestValidator.equals(
    "file size matches",
    retrievedImage.file_size,
    image.file_size,
  );
  TestValidator.equals(
    "mime type matches",
    retrievedImage.mime_type,
    image.mime_type,
  );
  TestValidator.equals("width matches", retrievedImage.width, image.width);
  TestValidator.equals("height matches", retrievedImage.height, image.height);
}
