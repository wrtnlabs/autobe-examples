import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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

export async function test_api_discussion_board_registered_user_article_images_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Registered user join and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(authorized);
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorized.token.access;
  // 2. Prepare a valid IDiscussionBoardArticleImage.IRequest data for the update
  const body = {
    data: [
      {
        imageUrl: `https://example.com/image_${RandomGenerator.alphaNumeric(6)}.jpg`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        displayOrder: 1,
      },
      {
        imageUrl: `https://example.com/image_${RandomGenerator.alphaNumeric(6)}.png`,
        description: null,
        displayOrder: 2,
      },
    ],
    page: 1,
    limit: 2,
  } satisfies IDiscussionBoardArticleImage.IRequest;
  // 3. Use a random UUID that doesn't exist for articleId
  const fakeArticleId = typia.random<string & tags.Format<"uuid">>();
  // 4. Expect HTTP 404 Not Found when updating images for non-existent article
  await TestValidator.httpError(
    "update images with non-existent articleId results in 404",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.images.updateImages(
        userConnection,
        {
          articleId: fakeArticleId,
          body,
        },
      );
    },
  );
}
