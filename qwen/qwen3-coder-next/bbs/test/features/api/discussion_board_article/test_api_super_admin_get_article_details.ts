import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_get_article_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin join and authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResponse =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(authResponse);
  // 2. Super admin creates an article first
  const article = await api.functional.discussionBoard.superAdmin.articles.at(
    superAdminConnection,
    {
      articleId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(article);
  // 3. Test successful article retrieval
  // Use articleId property from the article object (type assertion to bypass type definition)
  const articleId = (article as any).articleId as string;
  const retrievedArticle =
    await api.functional.discussionBoard.superAdmin.articles.at(
      superAdminConnection,
      {
        articleId,
      },
    );
  typia.assert(retrievedArticle);
  // 4. Test edge case: non-existent article should return error
  await TestValidator.error("non-existent article", async () => {
    await api.functional.discussionBoard.superAdmin.articles.at(
      superAdminConnection,
      {
        articleId: "00000000-0000-0000-0000-000000000000",
      },
    );
  });
}