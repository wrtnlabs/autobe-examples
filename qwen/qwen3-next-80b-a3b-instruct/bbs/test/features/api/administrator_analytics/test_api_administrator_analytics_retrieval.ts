import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleView";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator to access analytics endpoint
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials: IEconomicBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_administrator_join(superAdminConnection, {
    body: superAdminCredentials,
  });
  // 2. Call the administrator analytics endpoint to retrieve article view statistics
  const analyticsResult =
    await api.functional.economicBoard.administrator.analytics.index(
      superAdminConnection,
    );
  typia.assert(analyticsResult);
  // 3. Validate pagination structure exists and is correct type
  TestValidator.predicate(
    "pagination exists",
    analyticsResult.pagination !== null,
  );
  TestValidator.predicate(
    "pagination current is a number",
    typeof analyticsResult.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is a number",
    typeof analyticsResult.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is a number",
    typeof analyticsResult.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is a number",
    typeof analyticsResult.pagination.pages === "number",
  );
  TestValidator.predicate(
    "pagination current >= 0",
    analyticsResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    analyticsResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    analyticsResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    analyticsResult.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate(
    "data is an array",
    Array.isArray(analyticsResult.data),
  );
  // 5. Validate each item in data conforms to IEconomicBoardArticleView.ISummary
  for (const item of analyticsResult.data) {
    TestValidator.equals(
      "article_id is UUID",
      typeof item.article_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          item.article_id,
        ),
      true,
    );
    TestValidator.predicate(
      "view_count is a non-negative number",
      typeof item.view_count === "number" && item.view_count >= 0,
    );
    TestValidator.predicate(
      "first_view is ISO date-time",
      !isNaN(new Date(item.first_view).getTime()) &&
        item.first_view === new Date(item.first_view).toISOString(),
    );
    TestValidator.predicate(
      "last_view is ISO date-time",
      !isNaN(new Date(item.last_view).getTime()) &&
        item.last_view === new Date(item.last_view).toISOString(),
    );
    TestValidator.predicate(
      "total_unique_users is a non-negative number",
      typeof item.total_unique_users === "number" &&
        item.total_unique_users >= 0,
    );
  }
  // 6. Ensure we pass compiler validation and match schema exactly — no extra properties
  // No redundant asserts — typia.assert already validates full shape
}
