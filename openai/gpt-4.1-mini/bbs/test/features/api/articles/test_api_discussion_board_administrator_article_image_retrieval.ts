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

export async function test_api_discussion_board_administrator_article_image_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of a specific image attached to an article by administrator.
  const adminConnection: api.IConnection = { host: connection.host };
  const registeredUserConnection: api.IConnection = { host: connection.host };
  // Administrator joins
  await authorize_administrator_join(adminConnection, { body: {} });
  // Registered user joins
  await authorize_registered_user_join(registeredUserConnection, { body: {} });
  // Registered user logs in to obtain authorization header
  await authorize_registered_user_login(registeredUserConnection, { body: {} });
  // Create article as registered user
  const rawArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      { body: {} },
    );
  typia.assert(rawArticle);
  const article = rawArticle as IDiscussionBoardArticle & { id: string };

  // Attach image to article
  const rawImage =
    await generate_random_discussion_board_registered_user_articles_images_create_image(
      registeredUserConnection,
      {
        params: { articleId: article.id },
        body: {}, // use empty body to trigger generator
      },
    );
  typia.assert(rawImage);
  const image = rawImage as IDiscussionBoardArticleImage & {
    id: string;
    imageUrl: string;
    description: string | null;
    displayOrder: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };

  // Admin retrieves the image metadata
  const rawImageRetrieved =
    await api.functional.discussionBoard.administrator.articles.images.at(
      adminConnection,
      {
        articleId: article.id,
        imageId: image.id,
      },
    );
  typia.assert(rawImageRetrieved);
  const imageRetrieved = rawImageRetrieved as typeof image;

  // Validate returned data matches what was created
  TestValidator.equals("imageId matches", imageRetrieved.id, image.id);
  TestValidator.equals(
    "imageUrl matches",
    imageRetrieved.imageUrl,
    image.imageUrl,
  );
  TestValidator.equals(
    "description matches",
    imageRetrieved.description,
    image.description,
  );
  TestValidator.equals(
    "displayOrder matches",
    imageRetrieved.displayOrder,
    image.displayOrder,
  );

  // Validate timestamps are strings and ISO8601 format
  const iso8601Regex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  TestValidator.predicate(
    "createdAt in ISO8601 format",
    typeof imageRetrieved.created_at === "string" &&
      iso8601Regex.test(imageRetrieved.created_at),
  );
  TestValidator.predicate(
    "updatedAt in ISO8601 format",
    typeof imageRetrieved.updated_at === "string" &&
      iso8601Regex.test(imageRetrieved.updated_at),
  );
  // deleted_at can be null or string ISO8601 format
  TestValidator.predicate(
    "deletedAt is null or ISO8601 format",
    imageRetrieved.deleted_at === null ||
      (typeof imageRetrieved.deleted_at === "string" &&
        iso8601Regex.test(imageRetrieved.deleted_at)),
  );

  // Scenario 2: Retrieval attempt for a non-existent image ID
  const randomImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 error on non-existent image",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.articles.images.at(
        adminConnection,
        {
          articleId: article.id,
          imageId: randomImageId,
        },
      );
    },
  );

  // Scenario 3: Retrieval of an image for a soft-deleted article or image
  // Since no delete API is provided, simulate 404 error with random UUIDs representing deleted resources
  const deletedImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 error on soft-deleted image",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.articles.images.at(
        adminConnection,
        {
          articleId: article.id,
          imageId: deletedImageId,
        },
      );
    },
  );

  const deletedArticleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 error on soft-deleted article",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.articles.images.at(
        adminConnection,
        {
          articleId: deletedArticleId,
          imageId: image.id,
        },
      );
    },
  );
}
