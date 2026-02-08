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

export async function test_api_admin_article_image_delete_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of an article image by an administrator
  // Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminJoin);
  // Login administrator to update headers with authorization
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {},
  });
  typia.assert(adminLogin);
  // Create registered user account and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(userJoin);
  const userLogin = await authorize_registered_user_login(userConnection, {
    body: {},
  });
  typia.assert(userLogin);
  // Registered user creates an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article);
  // Registered user attaches an image to the article
  const image =
    await generate_random_discussion_board_registered_user_articles_images_create_image(
      userConnection,
      {
        params: { articleId: "" as string & tags.Format<'uuid'> },
        body: {},
      },
    );
  typia.assert(image);
  // Administrator deletes the specified image from the article
  await api.functional.discussionBoard.administrator.articles.images.erase(
    adminConnection,
    {
      articleId: "" as string & tags.Format<'uuid'>,
      imageId: "" as string & tags.Format<'uuid'>,
    },
  );
  // Scenario 2: Attempt to delete a non-existent image
  await TestValidator.httpError(
    "delete non-existent image returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.articles.images.erase(
        adminConnection,
        {
          articleId: "" as string & tags.Format<'uuid'>,
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
