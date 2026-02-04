import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalesOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalesOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSalesOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_sales_analytics_monthly(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // Step 2: Calculate previous month date range
  const now = new Date();
  let previousYear = now.getFullYear();
  let previousMonth = now.getMonth() - 1;
  if (previousMonth < 0) {
    previousMonth = 11;
    previousYear -= 1;
  }
  const expectedTimeInterval = `${previousYear}-${previousMonth + 1 < 10 ? "0" + (previousMonth + 1) : previousMonth + 1}`;
  const startOfMonth = new Date(previousYear, previousMonth, 1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const endOfMonth = new Date(previousYear, previousMonth + 1, 1);
  endOfMonth.setUTCHours(0, 0, 0, 0);
  endOfMonth.setDate(endOfMonth.getDate() - 1);
  endOfMonth.setUTCHours(23, 59, 59, 999);
  // Step 3: Call analytics endpoint
  const analyticsData =
    await api.functional.shoppingMall.admin.analytics.sales.index(
      adminConnection,
      {
        body: {
          status: "completed",
          min_created_at: startOfMonth.toISOString(),
          max_created_at: endOfMonth.toISOString(),
        } satisfies IShoppingMallSalesOrder.IRequest,
      },
    );
  // Step 4: Validate response
  typia.assert(analyticsData);
  // Validate expected record count
  TestValidator.predicate(
    "analytics data should have at least one record",
    analyticsData.data.length > 0,
  );
  // Validate time interval matches expected format
  const firstRecord = analyticsData.data[0];
  TestValidator.equals(
    "time interval should match previous month",
    firstRecord.time_interval,
    expectedTimeInterval,
  );
  // Validate positive metrics
  TestValidator.predicate(
    "total revenue should be positive",
    firstRecord.total_revenue > 0,
  );
  TestValidator.predicate(
    "average order value should be positive",
    firstRecord.average_order_value > 0,
  );
  TestValidator.predicate(
    "order count should be positive",
    firstRecord.order_count > 0,
  );
  // Validate growth percentage is null for first period
  TestValidator.equals(
    "growth percentage should be null for first period in time series",
    firstRecord.growth_percentage,
    null,
  );
}
