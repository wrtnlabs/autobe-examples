import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_administrator_article_tag_mapping_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminJoin);
  // Administrator login to update authorization header
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {},
  });
  typia.assert(adminLogin);
  // 2. Registered user registration and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(userJoin);
  const userLogin = await authorize_registered_user_login(userConnection, {
    body: {},
  });
  typia.assert(userLogin);
  // 3. Registered user creates an article
  await generate_random_discussion_board_registered_user_articles_create(
    userConnection,
    {
      body: {},
    },
  );
  // 4. Attempt to delete a non-existent tag mapping as admin
  await TestValidator.httpError(
    "Tag mapping deletion not found",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.articles.tag_mappings.eraseTagMapping(
        adminConnection,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          tagMappingId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
