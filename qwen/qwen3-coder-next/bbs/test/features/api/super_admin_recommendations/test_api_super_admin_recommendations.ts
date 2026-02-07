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

export async function test_api_super_admin_recommendations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // 2. Call recommendations endpoint
  const recommendations =
    await api.functional.discussionBoard.superAdmin.recommendations.index(
      superAdminConnection,
    );
  typia.assert(recommendations);
  // 3. Validate pagination structure through access
  const pagination = recommendations.pagination;
  const current = pagination.current;
  const limit = pagination.limit;
  const records = pagination.records;
  const pages = pagination.pages;
  // 4. Validate article summary format
  const articles = recommendations.data;
  articles.forEach((article) => {
    // Article validation handled by main typia.assert
  });
  // 5. Business validation
  TestValidator.predicate("current page >= 1", current >= 1);
  TestValidator.predicate("limit > 0", limit > 0);
  TestValidator.predicate("records >= 0", records >= 0);
  TestValidator.predicate("pages >= 0", pages >= 0);
  TestValidator.equals(
    "data array length matches pagination limit or less",
    articles.length,
    Math.min(limit, records),
  );
}
