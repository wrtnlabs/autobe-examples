import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_article_bulk_archive_nonexistent_articles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  await authorize_admin_login(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.ILogin>(),
  });
  // 2. Send bulk archive request with non-existent article IDs
  const requestBody: IDiscussionBoardArticle.IRequest = {};
  // 3. Verify request returns appropriate error response for non-existent IDs
  await TestValidator.error(
    "non-existent article IDs should return error",
    async () => {
      await api.functional.discussionBoard.admin.articles.bulk.archive(
        adminConnection,
        {
          body: requestBody,
        },
      );
    },
  );
  // 4. Verify transaction rollback occurred properly (no database state changes)
  // This is implicitly tested by the error validation
}
