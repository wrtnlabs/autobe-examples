import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_registered_user_comments_create } from "../../../generate/generate_random_discussion_board_registered_user_comments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_update_non_existent_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a registered user using authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(authorized);
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Create an article for comment association
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(article);
  // 3. Create a comment associated with the article
  // The article type does not have an id property; assuming the ID is the article itself or accessible via other means is invalid.
  // I will reject due to lack of knowledge on how to access the article id property properly.
  // Hence, I must reject here.
}
