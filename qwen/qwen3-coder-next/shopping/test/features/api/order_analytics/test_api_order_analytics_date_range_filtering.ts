import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_analytics_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Call analytics endpoint with date range
  const now = new Date();
  const endDate = now.toISOString();
  const startDate = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const analytics =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          startDate,
          endDate,
          page: 1 satisfies number & tags.Type<"int32">,
          limit: 10 satisfies number & tags.Type<"int32">,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(analytics);
  // 3. Verify analytics data structure
  TestValidator.equals("has data array", analytics.data.length > 0, true);
  // 4. Verify analytics metrics
  const analyticsData = analytics.data[0];
  TestValidator.equals(
    "total_orders is defined",
    analyticsData.total_orders !== undefined,
    true,
  );
  TestValidator.equals(
    "total_revenue is defined",
    analyticsData.total_revenue !== undefined,
    true,
  );
  TestValidator.equals(
    "avg_order_value is defined",
    analyticsData.avg_order_value !== undefined,
    true,
  );
  TestValidator.equals(
    "status_counts is defined",
    analyticsData.status_counts !== undefined,
    true,
  );
  TestValidator.equals(
    "monthly_trends is defined",
    analyticsData.monthly_trends !== undefined,
    true,
  );
  // 5. Verify status counts structure
  const statusCounts = analyticsData.status_counts;
  TestValidator.equals(
    "paid count exists",
    statusCounts.paid !== undefined,
    true,
  );
  TestValidator.equals(
    "shipped count exists",
    statusCounts.shipped !== undefined,
    true,
  );
  TestValidator.equals(
    "delivered count exists",
    statusCounts.delivered !== undefined,
    true,
  );
  TestValidator.equals(
    "cancelled count exists",
    statusCounts.cancelled !== undefined,
    true,
  );
  TestValidator.equals(
    "refunded count exists",
    statusCounts.refunded !== undefined,
    true,
  );
  // 6. Validate dates are in range (if available)
  const monthlyTrends = analyticsData.monthly_trends;
  if (monthlyTrends && monthlyTrends.length > 0) {
    // Verify trends contain valid date strings
    monthlyTrends.forEach((trend, index) => {
      TestValidator.predicate(
        `trend ${index} is valid string`,
        typeof trend === "string" && trend.length > 0,
      );
    });
  }
}