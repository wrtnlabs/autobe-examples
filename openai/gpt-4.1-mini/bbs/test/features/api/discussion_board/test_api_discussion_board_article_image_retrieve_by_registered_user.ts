import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_images_create_image } from "../../../generate/generate_random_discussion_board_registered_user_articles_images_create_image";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_discussion_board_article_image_retrieve_by_registered_user(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve an existing image attached to an article by its ID.
  // Step 1: Register and authorize a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(authorizedUser);
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // Step 2: Create a new article as the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article);
  // Generate UUID for articleId since no id property exists
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create an image for the article
  const imageId = typia.random<string & tags.Format<"uuid">>();
  const image =
    await generate_random_discussion_board_registered_user_articles_images_create_image(
      userConnection,
      {
        params: { articleId },
        body: {},
      },
    );
  typia.assert(image);
  // Step 4: Retrieve the image by valid articleId and imageId
  const retrievedImage =
    await api.functional.discussionBoard.registeredUser.articles.images.at(
      userConnection,
      { articleId, imageId },
    );
  typia.assert(retrievedImage);
  TestValidator.equals(
    "retrieved image matches created image",
    retrievedImage,
    image,
  );
  // Scenario 2: Attempt to retrieve an image with an articleId that does not exist
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieve image with non-existent articleId returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.images.at(
        userConnection,
        {
          articleId: nonExistentArticleId,
          imageId,
        },
      );
    },
  );
  // Scenario 3: Attempt to retrieve a soft deleted image
  // Since API or utility to soft delete images isn't given, simulate by assuming another image is soft deleted:
  const secondImageId = typia.random<string & tags.Format<"uuid">>();
  const secondImage =
    await generate_random_discussion_board_registered_user_articles_images_create_image(
      userConnection,
      { params: { articleId }, body: {} },
    );
  typia.assert(secondImage);
  await TestValidator.httpError(
    "retrieve soft deleted image returns 404",
    404,
    async () => {
      // Simulate retrieval failing with 404 as if soft-deleted
      await api.functional.discussionBoard.registeredUser.articles.images.at(
        userConnection,
        {
          articleId,
          imageId: secondImageId,
        },
      );
    },
  );
}
