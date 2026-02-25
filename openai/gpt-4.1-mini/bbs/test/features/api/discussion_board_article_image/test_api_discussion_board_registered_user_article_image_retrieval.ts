import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_discussion_board_registered_user_article_image_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve metadata of an existing image attached to an article.
  // 1. Register a new user and authenticate
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_registered_user_join(
    userJoinConnection,
    { body: {} },
  );
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Create a new article by this user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article);
  // 3. Attach an image to the article
  const image =
    await generate_random_discussion_board_registered_user_articles_images_create_image(
      userConnection,
      {
        body: {},
        params: { articleId: article.id },
      },
    );
  typia.assert(image);
  // 4. Using authenticated user token, request GET /discussionBoard/registeredUser/articles/{articleId}/images/{imageId}
  const retrievedImage =
    await api.functional.discussionBoard.registeredUser.articles.images.atImage(
      userConnection,
      {
        articleId: article.id,
        imageId: image.id,
      },
    );
  typia.assert(retrievedImage);
  // 5. Validate the retrieved image metadata
  TestValidator.equals(
    "image articleId matches",
    retrievedImage.discussionBoardArticleId,
    article.id,
  );
  TestValidator.predicate(
    "imageUrl is non-empty string",
    typeof retrievedImage.imageUrl === "string" &&
      retrievedImage.imageUrl.length > 0,
  );
  TestValidator.predicate(
    "displayOrder is integer",
    Number.isInteger(retrievedImage.displayOrder),
  );
  TestValidator.predicate(
    "createdAt is valid ISO date-time",
    !isNaN(Date.parse(retrievedImage.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO date-time",
    !isNaN(Date.parse(retrievedImage.updatedAt)),
  );
  // Scenario 2: Attempt to retrieve an image using a non-existent imageId.
  const bogusImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 error on non-existent imageId",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.images.atImage(
        userConnection,
        {
          articleId: article.id,
          imageId: bogusImageId,
        },
      );
    },
  );
}
