import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IArticleStatusUpdateResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IArticleStatusUpdateResult";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_article_status_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Generate a valid article UUID
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update article status to 'published' using the admin connection
  const result = await api.functional.admin.articles.status.updateArticleStatus(
    adminConnection,
    {
      articleId,
      body: {
        status: "published", // Using string literal since it's a known enum value from IAdmin.IUpdateArticleStatus
      } satisfies IAdmin.IUpdateArticleStatus,
    },
  );
  typia.assert(result);
  // Step 4: Validate the response data
  TestValidator.equals("status log ID is valid UUID", result.id, result.id);
  TestValidator.predicate(
    "status log ID is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );
  TestValidator.equals(
    "article ID matches request",
    result.articleId,
    articleId,
  );
  TestValidator.equals("status is published", result.status, "published");
  TestValidator.equals(
    "changedBy matches admin ID",
    result.changedBy,
    admin.id,
  );
}
