import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_images_create_image } from "../../../generate/generate_random_discussion_board_registered_user_articles_images_create_image";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_article_image_update_registered_user_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Registered user updates their own article image successfully
  const userAJoinConnection: api.IConnection = { host: connection.host };
  // Join user A
  const userAAuth = await authorize_registered_user_join(userAJoinConnection, {
    body: {},
  });
  userAJoinConnection.headers = {
    Authorization: `Bearer ${userAAuth.token.access}`,
  };
  // Create an article by user A
  const articleA =
    (await generate_random_discussion_board_registered_user_articles_create(
      userAJoinConnection,
      { body: {} },
    )) as IDiscussionBoardArticle & {
      id: string;
    };
  typia.assert(articleA);
  // Create an image attached to the article by user A
  const imageA =
    (await generate_random_discussion_board_registered_user_articles_images_create_image(
      userAJoinConnection,
      {
        params: { articleId: articleA.id },
        body: {},
      },
    )) as IDiscussionBoardArticleImage & {
      id: string;
    };
  typia.assert(imageA);
  // Prepare update data for image
  const updateData = {
    imageUrl: RandomGenerator.alphaNumeric(20) + ".jpg",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 1,
  };
  // Update the image by user A (authorized)
  const updatedImage =
    await api.functional.discussionBoard.registeredUser.articles.images.updateImage(
      userAJoinConnection,
      {
        articleId: articleA.id,
        imageId: imageA.id,
        body: updateData,
      },
    );
  typia.assert(updatedImage);
  // Scenario 2: Registered user B attempts to update user A's article image - expect authorization failure
  const userBJoinConnection: api.IConnection = { host: connection.host };
  // Join user B
  const userBAuth = await authorize_registered_user_join(userBJoinConnection, {
    body: {},
  });
  userBJoinConnection.headers = {
    Authorization: `Bearer ${userBAuth.token.access}`,
  };
  // user B attempts to update user A's image
  await TestValidator.httpError(
    "unauthorized update by different user",
    403,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.images.updateImage(
        userBJoinConnection,
        {
          articleId: articleA.id,
          imageId: imageA.id,
          body: {
            imageUrl: RandomGenerator.alphaNumeric(20) + ".png",
            description: RandomGenerator.paragraph({ sentences: 1 }),
            displayOrder: 2,
          },
        },
      );
    },
  );
  // Scenario 3: Administrator updates the image of user A's article
  const adminJoinConnection: api.IConnection = { host: connection.host };
  // Join administrator
  const adminAuth = await authorize_administrator_join(adminJoinConnection, {
    body: {},
  });
  adminJoinConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Administrator updates the image
  const adminUpdateData = {
    imageUrl: RandomGenerator.alphaNumeric(25) + ".jpeg",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 3,
  };
  const adminUpdatedImage =
    await api.functional.discussionBoard.registeredUser.articles.images.updateImage(
      adminJoinConnection,
      {
        articleId: articleA.id,
        imageId: imageA.id,
        body: adminUpdateData,
      },
    );
  typia.assert(adminUpdatedImage);
}
