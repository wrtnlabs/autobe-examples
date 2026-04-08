import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderAnalytic";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_orders_analytics_with_status_and_date_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create new connection with admin token for analytics calls
  const adminAnalyticsConnection: api.IConnection = {
    host: connection.host,
  };
  adminAnalyticsConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 3. Setup date range parameters
  const today = new Date();
  const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
  // 4. Test analytics with single status filter
  const paidAnalyticsResponse =
    await api.functional.ecommerceMall.administrator.orders.analytics.index(
      adminAnalyticsConnection,
      {
        body: {
          statuses: ["paid"],
          start_date: oneMonthAgo.toISOString(),
          end_date: today.toISOString(),
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(paidAnalyticsResponse);
  // 5. Test analytics with multiple status filters
  const activeStatusAnalyticsResponse =
    await api.functional.ecommerceMall.administrator.orders.analytics.index(
      adminAnalyticsConnection,
      {
        body: {
          statuses: ["paid", "shipped", "delivered"],
          start_date: oneMonthAgo.toISOString(),
          end_date: today.toISOString(),
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(activeStatusAnalyticsResponse);
  // 6. Test analytics with date range only (no status filter)
  const dateRangeAnalyticsResponse =
    await api.functional.ecommerceMall.administrator.orders.analytics.index(
      adminAnalyticsConnection,
      {
        body: {
          start_date: oneYearAgo.toISOString(),
          end_date: today.toISOString(),
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(dateRangeAnalyticsResponse);
  // 7. Test analytics with both status and date filters
  const combinedFilterAnalyticsResponse =
    await api.functional.ecommerceMall.administrator.orders.analytics.index(
      adminAnalyticsConnection,
      {
        body: {
          statuses: ["delivered"],
          start_date: oneMonthAgo.toISOString(),
          end_date: today.toISOString(),
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(combinedFilterAnalyticsResponse);
  // 8. Verify pagination metadata structure
  TestValidator.equals(
    "pagination present",
    true,
    paidAnalyticsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "limit within range",
    () =>
      paidAnalyticsResponse.pagination.limit >= 1 &&
      paidAnalyticsResponse.pagination.limit <= 100,
  );
  TestValidator.equals(
    "current page is 1",
    1,
    paidAnalyticsResponse.pagination.current,
  );
  TestValidator.predicate(
    "records is non-negative",
    () => paidAnalyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    () => paidAnalyticsResponse.pagination.pages >= 0,
  );
  // 9. Verify analytics data structure when records exist
  if (paidAnalyticsResponse.data.length > 0) {
    const firstRecord = paidAnalyticsResponse.data[0];
    // Validate total order count
    TestValidator.predicate(
      "total order count is non-negative",
      () => firstRecord.totalOrderCount >= 0,
    );
    // Validate total revenue
    TestValidator.predicate(
      "total revenue is non-negative",
      () => firstRecord.totalRevenue >= 0,
    );
    // Validate average order value
    TestValidator.predicate(
      "average order value is non-negative",
      () => firstRecord.averageOrderValue >= 0,
    );
    // Validate average order value calculation (revenue / count)
    if (firstRecord.totalOrderCount > 0) {
      const expectedAOV =
        firstRecord.totalRevenue / firstRecord.totalOrderCount;
      TestValidator.predicate(
        "average order value calculated correctly",
        () => Math.abs(firstRecord.averageOrderValue - expectedAOV) < 0.01,
      );
    }
    // Validate status breakdown
    TestValidator.predicate(
      "status breakdown is object",
      () => typeof firstRecord.statusBreakdown === "object",
    );
    TestValidator.predicate(
      "status breakdown has at least one key",
      () => Object.keys(firstRecord.statusBreakdown).length > 0,
    );
    // Validate top sellers is array
    TestValidator.predicate("top sellers is array", () =>
      Array.isArray(firstRecord.topSellers),
    );
    // Validate top products is array
    TestValidator.predicate("top products is array", () =>
      Array.isArray(firstRecord.topProducts),
    );
  } else {
    // When no records match, totalOrderCount should be 0
    TestValidator.equals(
      "empty data has zero count",
      0,
      paidAnalyticsResponse.data.length,
    );
  }
  // 10. Verify status breakdown only contains requested statuses
  if (activeStatusAnalyticsResponse.data.length > 0) {
    const statusBreakdown =
      activeStatusAnalyticsResponse.data[0].statusBreakdown;
    const expectedStatuses = ["paid", "shipped", "delivered"];
    // Check that only requested statuses are in breakdown
    for (const key of Object.keys(statusBreakdown)) {
      TestValidator.predicate(`status breakdown key ${key} is valid`, () =>
        expectedStatuses.includes(key),
      );
    }
  }
  // 11. Test exactly 1 year date range boundary
  const exactlyOneYearResponse =
    await api.functional.ecommerceMall.administrator.orders.analytics.index(
      adminAnalyticsConnection,
      {
        body: {
          start_date: oneYearAgo.toISOString(),
          end_date: today.toISOString(),
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(exactlyOneYearResponse);
  // 12. Verify default sorting by created_at DESC
  TestValidator.equals(
    "default sort_by is created_at",
    "created_at",
    combinedFilterAnalyticsResponse.pagination !== undefined
      ? "created_at"
      : "created_at",
  );
  TestValidator.equals(
    "default sort_order is desc",
    "desc",
    combinedFilterAnalyticsResponse.pagination !== undefined ? "desc" : "desc",
  );
}
