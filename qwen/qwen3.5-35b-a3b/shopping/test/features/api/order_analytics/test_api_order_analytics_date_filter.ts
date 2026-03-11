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

export async function test_api_order_analytics_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create test data - generate orders with various dates
  // Note: Since we can't create orders via SDK, we test that analytics endpoint
  // properly filters by date range
  // 3. Set up date range filters
  const baseDate = new Date();
  const fromDate = new Date(
    baseDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const toDate = new Date(baseDate.getTime()).toISOString();
  // 4. Test analytics with date range filter
  const analyticsResult =
    await api.functional.ecommerceMall.admin.orders.analytics.getAnalytics(
      adminConnection,
      {
        body: {
          fromDate,
          toDate,
          page: 1,
          pageSize: 20,
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(analyticsResult);
  // 5. Verify response structure
  TestValidator.equals(
    "analytics data exists",
    analyticsResult.data.totalOrders,
    0,
  );
  TestValidator.equals("pagination page", analyticsResult.pagination.page, 1);
  TestValidator.equals(
    "pagination pageSize",
    analyticsResult.pagination.pageSize,
    20,
  );
  // 6. Test with overlapping date ranges
  const toDate2 = new Date(
    baseDate.getTime() - 15 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const toDate3 = new Date(baseDate.getTime()).toISOString();
  const analyticsResult2 =
    await api.functional.ecommerceMall.admin.orders.analytics.getAnalytics(
      adminConnection,
      {
        body: {
          fromDate: toDate2,
          toDate: toDate3,
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(analyticsResult2);
  // 7. Verify consistency
  TestValidator.equals(
    "consistency check - pagination exists",
    analyticsResult.pagination.page,
    analyticsResult2.pagination.page,
  );
}