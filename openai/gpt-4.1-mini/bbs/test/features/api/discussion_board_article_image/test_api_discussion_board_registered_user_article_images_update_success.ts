import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleImageRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImageRequest";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_registered_user_article_images_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Registered user join and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(userAuth);
  userConnection.headers = { Authorization: userAuth.token.access };
  // 2. Create a new discussion board article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article);
  // 3. Prepare new images data for update (non-empty list)
  // Since IDiscussionBoardArticleImageRequest.Item is empty, define the data shape inline
  const imagesData = {
    data: [
      {
        imageUrl: `https://example.com/image1_${RandomGenerator.alphabets(5)}.jpg`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        displayOrder: 1,
      },
      {
        imageUrl: `https://example.com/image2_${RandomGenerator.alphabets(5)}.jpg`,
        description: null,
        displayOrder: 2,
      },
    ],
  } satisfies IDiscussionBoardArticleImage.IRequest;
  // 4. Call PATCH /discussionBoard/registeredUser/articles/{articleId}/images to update images
  const updatedImage =
    await api.functional.discussionBoard.registeredUser.articles.images.updateImages(
      userConnection,
      {
        articleId: article.id,
        body: imagesData,
      },
    );
  typia.assert(updatedImage);
  // 5. Validate response fields against input data
  TestValidator.equals(
    "updated imageUrl",
    updatedImage.imageUrl,
    imagesData.data[imagesData.data.length - 1].imageUrl,
  );
  if (imagesData.data[imagesData.data.length - 1].description !== null) {
    TestValidator.equals(
      "updated description",
      updatedImage.description ?? null,
      imagesData.data[imagesData.data.length - 1].description,
    );
  } else {
    TestValidator.equals(
      "updated description null",
      updatedImage.description ?? null,
      null,
    );
  }
  TestValidator.equals(
    "updated displayOrder",
    updatedImage.displayOrder,
    imagesData.data[imagesData.data.length - 1].displayOrder,
  );
  // 6. Update with empty image list to remove all images
  const emptyImagesData: IDiscussionBoardArticleImage.IRequest = {
    data: [],
  };
  const removedImage =
    await api.functional.discussionBoard.registeredUser.articles.images.updateImages(
      userConnection,
      {
        articleId: article.id,
        body: emptyImagesData,
      },
    );
  typia.assert(removedImage);
  // Since removedImage is also a single IDiscussionBoardArticleImage, validate displayOrder for removal case
  TestValidator.predicate(
    "image removed (displayOrder is 0 or less)",
    removedImage.displayOrder <= 0 ||
      removedImage.imageUrl === "" ||
      removedImage.imageUrl === null,
  );
}
