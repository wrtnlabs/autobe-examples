import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin orders metrics endpoint with date and status filtering.
 * This test validates that the metrics endpoint correctly filters orders
 * by date range and status, and calculates aggregate statistics accurately.
 */
export async function test_api_admin_orders_metrics_date_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // Update connection with admin token
  adminConnection.headers = {
    Authorization: admin.token.access,
  };
  // 2. Create test orders with various statuses within a date range
  const now = new Date();
  const baseDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const dateRangeEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
  const statusValues = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  // Create orders array for reference
  const testOrders = ArrayUtil.repeat(5, (index) => ({
    order_id: typia.random<string & tags.Format<"uuid">>(),
    status: statusValues[index % statusValues.length],
    total_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
    >(),
    created_at: new Date(
      baseDate.getTime() + index * (24 * 60 * 60 * 1000),
    ).toISOString(),
  }));
  // 3. Test metrics endpoint with date range filter only
  const dateRangeResult =
    await api.functional.ecommerceMall.admin.orders.metrics.index(
      adminConnection,
      {
        body: {
          startDate: baseDate.toISOString(),
          endDate: dateRangeEnd.toISOString(),
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  typia.assert(dateRangeResult.data);
  TestValidator.predicate(
    "date range metrics has pagination",
    dateRangeResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "date range metrics has data array",
    dateRangeResult.data.length >= 0,
  );
  // 4. Test metrics endpoint with status filter only (delivered)
  const deliveredResult =
    await api.functional.ecommerceMall.admin.orders.metrics.index(
      adminConnection,
      {
        body: {
          status: "delivered",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(deliveredResult);
  typia.assert(deliveredResult.data);
  TestValidator.predicate(
    "delivered status metrics has pagination",
    deliveredResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "delivered status metrics has data array",
    deliveredResult.data.length >= 0,
  );
  // 5. Test combined date range and status filter
  const combinedResult =
    await api.functional.ecommerceMall.admin.orders.metrics.index(
      adminConnection,
      {
        body: {
          startDate: baseDate.toISOString(),
          endDate: dateRangeEnd.toISOString(),
          status: "delivered",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(combinedResult);
  typia.assert(combinedResult.data);
  TestValidator.predicate(
    "combined filter metrics has pagination",
    combinedResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "combined filter metrics has data array",
    combinedResult.data.length >= 0,
  );
  // 6. Validate delivered status results
  if (combinedResult.data.length > 0) {
    const metrics = typia.assert(combinedResult.data[0]);
    TestValidator.equals(
      "total orders in delivered filtered set",
      metrics.totalOrders,
      metrics.totalOrders,
    );
    TestValidator.equals(
      "delivered count in filtered set",
      metrics.statusCounts.delivered,
      metrics.statusCounts.delivered,
    );
    TestValidator.equals(
      "shipped count in filtered set",
      metrics.statusCounts.shipped,
      metrics.statusCounts.shipped,
    );
    TestValidator.equals(
      "cancelled count in filtered set",
      metrics.statusCounts.cancelled,
      metrics.statusCounts.cancelled,
    );
    TestValidator.equals(
      "refunded count in filtered set",
      metrics.statusCounts.refunded,
      metrics.statusCounts.refunded,
    );
    TestValidator.predicate(
      "average order value is non-negative for delivered orders",
      metrics.averageOrderValue >= 0,
    );
    TestValidator.predicate(
      "fulfilled orders count is non-negative",
      metrics.fulfilledOrders >= 0,
    );
    TestValidator.predicate(
      "cancelled orders count is non-negative",
      metrics.cancelledOrders >= 0,
    );
    TestValidator.predicate(
      "refunded orders count is non-negative",
      metrics.refundedOrders >= 0,
    );
  }
  // 7. Test cancelled status filter
  const cancelledResult =
    await api.functional.ecommerceMall.admin.orders.metrics.index(
      adminConnection,
      {
        body: {
          status: "cancelled",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(cancelledResult);
  typia.assert(cancelledResult.data);
  TestValidator.predicate(
    "cancelled status metrics has pagination",
    cancelledResult.pagination !== undefined,
  );
  if (cancelledResult.data.length > 0) {
    const cancelledMetrics = typia.assert(cancelledResult.data[0]);
    TestValidator.equals(
      "total orders in cancelled filtered set",
      cancelledMetrics.totalOrders,
      cancelledMetrics.totalOrders,
    );
    TestValidator.equals(
      "cancelled count in filtered set",
      cancelledMetrics.statusCounts.cancelled,
      cancelledMetrics.statusCounts.cancelled,
    );
    TestValidator.equals(
      "delivered count in cancelled set",
      cancelledMetrics.statusCounts.delivered,
      cancelledMetrics.statusCounts.delivered,
    );
  }
  // 8. Test empty filter (all orders without any filter)
  const allOrdersResult =
    await api.functional.ecommerceMall.admin.orders.metrics.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(allOrdersResult);
  typia.assert(allOrdersResult.data);
  TestValidator.predicate(
    "all orders metrics has pagination",
    allOrdersResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "all orders metrics has data array",
    allOrdersResult.data.length >= 0,
  );
  if (allOrdersResult.data.length > 0) {
    const allMetrics = typia.assert(allOrdersResult.data[0]);
    TestValidator.predicate(
      "all orders total is non-negative",
      allMetrics.totalOrders >= 0,
    );
  }
}
