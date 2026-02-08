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

export async function test_api_discussion_board_article_image_create_forbidden_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup article owner user and create article
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoin = await authorize_registered_user_join(ownerConnection, {
    body: {},
  });
  ownerConnection.headers = {
    Authorization: `Bearer ${ownerJoin.token.access}`,
  };
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(article);
  // Bypass type limitation to extract 'id' property
  const articleId = (article as any).id as string & tags.Format<"uuid">;
  // 2. Setup another user who is not the owner
  const otherConnection: api.IConnection = { host: connection.host };
  const otherJoin = await authorize_registered_user_join(otherConnection, {
    body: {},
  });
  otherConnection.headers = {
    Authorization: `Bearer ${otherJoin.token.access}`,
  };
  // 3. Attempt to add image attachment to the article owned by owner
  await TestValidator.httpError("forbidden access", 403, async () => {
    await generate_random_discussion_board_registered_user_articles_images_create_image(
      otherConnection,
      {
        params: { articleId },
        body: {},
      },
    );
  });
}
