import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_administrator_article_detail_not_found_deleted_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new administrator account and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  // 2. Override adminConnection headers with Authorization token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 3. Generate a random UUID for an article ID
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve an article with a non-existent and deleted (soft-deleted) ID
  //    Expect a 404 Not Found HttpError
  await TestValidator.httpError(
    "should return 404 Not Found for a deleted or non-existent article",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.articles.at(
        adminConnection,
        {
          articleId: randomArticleId,
        },
      );
    },
  );
}
