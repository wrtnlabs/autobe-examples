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

export async function test_api_discussion_board_administrator_article_detail_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Without authentication: try to get article details, expect error due to no authorization
  await TestValidator.httpError(
    "unauthenticated article detail access",
    401,
    async () => {
      const articleId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.discussionBoard.administrator.articles.at(
        connection,
        {
          articleId,
        },
      );
    },
  );
  // 2. Authenticate as administrator using the join utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // SetAuthorization header for adminConnection
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Retrieve article details with administrator connection
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.administrator.articles.at(
      adminConnection,
      {
        articleId,
      },
    );
  typia.assert(article);
  // 4. Verify article data includes expected properties
  // Since detailed properties are unknown, check general object keys
  TestValidator.predicate(
    "article includes title and content",
    typeof article === "object" &&
      article !== null &&
      "title" in article &&
      "content" in article,
  );
}
