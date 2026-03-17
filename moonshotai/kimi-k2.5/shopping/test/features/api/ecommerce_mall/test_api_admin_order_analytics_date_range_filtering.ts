import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_analytics_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Test 1: Call order analytics with a date range filter
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const analyticsWithRange =
    await api.functional.ecommerceMall.admin.orderAnalytics.aggregate(
      adminConnection,
      {
        body: {
          startDate: sevenDaysAgo.toISOString(),
          endDate: threeDaysAgo.toISOString(),
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(analyticsWithRange);
  // Verify response structure
  TestValidator.predicate(
    "totalItems is non-negative",
    analyticsWithRange.totalItems >= 0,
  );
  TestValidator.predicate(
    "totalRevenue is non-negative",
    analyticsWithRange.totalRevenue >= 0,
  );
  TestValidator.predicate(
    "statusCounts has all required fields",
    typeof analyticsWithRange.statusCounts.paid === "number" &&
      typeof analyticsWithRange.statusCounts.shipped === "number" &&
      typeof analyticsWithRange.statusCounts.delivered === "number" &&
      typeof analyticsWithRange.statusCounts.cancelled === "number" &&
      typeof analyticsWithRange.statusCounts.refunded === "number",
  );
  TestValidator.predicate(
    "pendingCancellationRequests is non-negative",
    analyticsWithRange.pendingCancellationRequests >= 0,
  );
  TestValidator.predicate(
    "pendingRefundRequests is non-negative",
    analyticsWithRange.pendingRefundRequests >= 0,
  );
  // Test 2: Edge case - single day query (startDate equals endDate)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);
  const analyticsSingleDay =
    await api.functional.ecommerceMall.admin.orderAnalytics.aggregate(
      adminConnection,
      {
        body: {
          startDate: today.toISOString(),
          endDate: endOfToday.toISOString(),
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(analyticsSingleDay);
  // Verify single day response structure
  TestValidator.predicate(
    "single day totalItems is non-negative",
    analyticsSingleDay.totalItems >= 0,
  );
  TestValidator.predicate(
    "single day totalRevenue is non-negative",
    analyticsSingleDay.totalRevenue >= 0,
  );
  // Test 3: Call with only startDate (open-ended range)
  const analyticsStartOnly =
    await api.functional.ecommerceMall.admin.orderAnalytics.aggregate(
      adminConnection,
      {
        body: {
          startDate: sevenDaysAgo.toISOString(),
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(analyticsStartOnly);
  // Test 4: Call with only endDate (open-ended range)
  const analyticsEndOnly =
    await api.functional.ecommerceMall.admin.orderAnalytics.aggregate(
      adminConnection,
      {
        body: {
          endDate: threeDaysAgo.toISOString(),
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(analyticsEndOnly);
  // Test 5: Call with status filter combined with date range
  const analyticsWithStatusAndDate =
    await api.functional.ecommerceMall.admin.orderAnalytics.aggregate(
      adminConnection,
      {
        body: {
          startDate: sevenDaysAgo.toISOString(),
          endDate: now.toISOString(),
          status: "paid",
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(analyticsWithStatusAndDate);
  TestValidator.predicate(
    "status filter with date range returns valid data",
    analyticsWithStatusAndDate.totalItems >= 0 &&
      analyticsWithStatusAndDate.totalRevenue >= 0,
  );
}
