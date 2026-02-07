import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_article_list_retrieval_by_section(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // 2. Generate test data: Create a section and articles
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the target endpoint
  const result: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.superAdmin.sections.articles.index(
      superAdminConnection,
      {
        sectionId,
        body: typia.random<IDiscussionBoardArticle.IRequest>(),
      },
    );
  // 4. Validate response structure
  typia.assert(result);
  typia.assert(result.pagination);
  typia.assert(result.data);
  // 5. Validate pagination structure
  TestValidator.predicate("pagination exists", result.pagination !== undefined);
  TestValidator.predicate("page count >= 0", result.pagination.pages >= 0);
  TestValidator.predicate("record count >= 0", result.pagination.records >= 0);
  TestValidator.predicate("limit > 0", result.pagination.limit > 0);
  TestValidator.predicate("current page >= 0", result.pagination.current >= 0);
  // 6. Validate data structure
  TestValidator.predicate("data is array", Array.isArray(result.data));
}
