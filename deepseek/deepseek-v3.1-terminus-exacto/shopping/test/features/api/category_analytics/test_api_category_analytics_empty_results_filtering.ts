import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_category_analytics_empty_results_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {});
  // Test 1: Future date range (no results expected)
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year in future
  const futureStartDate = futureDate.toISOString();
  const futureEndDate = new Date(
    futureDate.getTime() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // +1 week
  const futureAnalytics =
    await api.functional.ecommerce.superAdministrator.category_analytics.index(
      superAdminConnection,
      {
        body: {
          start_date: futureStartDate,
          end_date: futureEndDate,
          page: 1,
          limit: 10,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
  typia.assert(futureAnalytics);
  TestValidator.equals(
    "future analytics: empty data array",
    futureAnalytics.data,
    [],
  );
  TestValidator.equals(
    "future analytics: zero records",
    futureAnalytics.pagination.records,
    0,
  );
  TestValidator.equals(
    "future analytics: zero pages",
    futureAnalytics.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future analytics: current page is 1",
    futureAnalytics.pagination.current,
    1,
  );
  TestValidator.equals(
    "future analytics: limit matches request",
    futureAnalytics.pagination.limit,
    10,
  );
  // Test 2: Non-existent category IDs (no results expected)
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const categoryFilterAnalytics =
    await api.functional.ecommerce.superAdministrator.category_analytics.index(
      superAdminConnection,
      {
        body: {
          category_ids: [nonExistentCategoryId],
          page: 1,
          limit: 10,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
  typia.assert(categoryFilterAnalytics);
  TestValidator.equals(
    "category filter: empty data array",
    categoryFilterAnalytics.data,
    [],
  );
  TestValidator.equals(
    "category filter: zero records",
    categoryFilterAnalytics.pagination.records,
    0,
  );
  TestValidator.equals(
    "category filter: zero pages",
    categoryFilterAnalytics.pagination.pages,
    0,
  );
  TestValidator.equals(
    "category filter: current page is 1",
    categoryFilterAnalytics.pagination.current,
    1,
  );
  TestValidator.equals(
    "category filter: limit matches request",
    categoryFilterAnalytics.pagination.limit,
    10,
  );
  // Test 3: Combined filters (future date + non-existent category)
  const combinedAnalytics =
    await api.functional.ecommerce.superAdministrator.category_analytics.index(
      superAdminConnection,
      {
        body: {
          start_date: futureStartDate,
          end_date: futureEndDate,
          category_ids: [nonExistentCategoryId],
          page: 1,
          limit: 10,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
  typia.assert(combinedAnalytics);
  TestValidator.equals(
    "combined filters: empty data array",
    combinedAnalytics.data,
    [],
  );
  TestValidator.equals(
    "combined filters: zero records",
    combinedAnalytics.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filters: zero pages",
    combinedAnalytics.pagination.pages,
    0,
  );
  TestValidator.equals(
    "combined filters: current page is 1",
    combinedAnalytics.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filters: limit matches request",
    combinedAnalytics.pagination.limit,
    10,
  );
  // Test 4: Verify API returns successful response without errors
  TestValidator.predicate(
    "API returns successful response with empty results",
    futureAnalytics.data.length === 0 &&
      categoryFilterAnalytics.data.length === 0 &&
      combinedAnalytics.data.length === 0,
  );
}
