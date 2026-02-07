import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_article_pin_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  // Join as admin to create admin account
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // Verify admin has valid authorization token
  TestValidator.predicate(
    "admin has access token",
    () => !!adminAuth.token.access,
  );
  TestValidator.predicate(
    "admin has refresh token",
    () => !!adminAuth.token.refresh,
  );
  // Test pin operation with admin connection
  // This endpoint requires an articleId to pin
  const testArticleId = typia.random<string & tags.Format<"uuid">>();
  // Pin the article - this should work with valid admin authorization
  await api.functional.discussionBoard.admin.articles.pin(adminConnection, {
    articleId: testArticleId,
  });
}
