import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_articles_images_update_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Setup administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  await authorize_administrator_login(adminConnection, { body: {} });
  // Setup registered user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_registered_user_join(userConnection, { body: {} });
  await authorize_registered_user_login(userConnection, { body: {} });
  // Registered user creates an article WITHOUT initial images
  // Cast created article to type with id property
  const createdArticle_raw =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {},
      },
    );
  // Cast to known interface to access id
  const createdArticle = createdArticle_raw as unknown as {
    id: string;
  };
  typia.assert(createdArticle_raw);
  const articleId = createdArticle.id;
  // 1) Administrator adds initial images
  const initialImagesBody: IDiscussionBoardArticleImage.IRequest = [
    {
      description: "Initial image 1",
      display_order: 1,
      url: `https://example.com/init-image-${RandomGenerator.alphaNumeric(6)}.jpg`,
    },
    {
      description: "Initial image 2",
      display_order: 2,
      url: `https://example.com/init-image-${RandomGenerator.alphaNumeric(6)}.jpg`,
    },
  ];
  const addedImages =
    await api.functional.discussionBoard.administrator.articles.images.updateImages(
      adminConnection,
      {
        articleId,
        body: initialImagesBody,
      },
    );
  typia.assert(addedImages);
  // 2) Administrator updates existing images: change descriptions, display order
  // and adds a new image (no id to signify new image)
  // Cast each image to extended interface to access id and url
  const imagesToUpdate: IDiscussionBoardArticleImage.IRequest[] =
    addedImages.data
      .map(
        (img) =>
          img as unknown as {
            id: string;
            description: string;
            display_order: number;
            url: string;
          },
      )
      .map((img, idx) => ({
        id: img.id,
        description: `Updated description ${idx + 1}`,
        display_order: idx + 1,
        url: img.url,
      }));
  // Add a new image without id
  imagesToUpdate.push({
    description: "New image description",
    display_order: imagesToUpdate.length + 1,
    url: `https://example.com/new-image-${RandomGenerator.alphaNumeric(6)}.jpg`,
  });
  const updatedImages =
    await api.functional.discussionBoard.administrator.articles.images.updateImages(
      adminConnection,
      {
        articleId,
        body: imagesToUpdate,
      },
    );
  typia.assert(updatedImages);
  TestValidator.predicate(
    "updatedImages contains updated images",
    updatedImages.data.some(
      (image) =>
        (image as any).description !== undefined &&
        typeof (image as any).description === "string" &&
        (image as any).description.startsWith("Updated description"),
    ),
  );
  TestValidator.predicate(
    "updatedImages contains new images",
    updatedImages.data.some(
      (image) => (image as any).description === "New image description",
    ),
  );
  // 3) Unauthorized registered user cannot update images
  await TestValidator.httpError(
    "registered user forbidden to update article images",
    403,
    async () =>
      await api.functional.discussionBoard.administrator.articles.images.updateImages(
        userConnection,
        {
          articleId,
          body: imagesToUpdate,
        },
      ),
  );
  // 4) 404 when article not found
  const fakeArticleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("404 when article not found", 404, async () => {
    await api.functional.discussionBoard.administrator.articles.images.updateImages(
      adminConnection,
      {
        articleId: fakeArticleId,
        body: imagesToUpdate,
      },
    );
  });
  // 5) 404 when image id not found
  if (imagesToUpdate.length > 0 && "id" in imagesToUpdate[0]) {
    const badUpdateBody = [...imagesToUpdate];
    badUpdateBody[0] = {
      ...badUpdateBody[0],
      id: typia.random<string & tags.Format<"uuid">>(),
    };
    await TestValidator.httpError(
      "404 when image id not found",
      404,
      async () => {
        await api.functional.discussionBoard.administrator.articles.images.updateImages(
          adminConnection,
          {
            articleId,
            body: badUpdateBody,
          },
        );
      },
    );
  }
}
