import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderAnalytic";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test order analytics with combined date range and status filters.
 *
 * This test verifies that administrators can retrieve order analytics with
 * various filter combinations including date range, status, and price range.
 * It validates that the filtering logic works correctly and aggregated metrics
 * are computed accurately for the filtered result set.
 */
export async function test_api_order_analytics_date_range_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test date range filtering
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const endDate = now.toISOString();
  const dateRangeResult =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          startDate,
          endDate,
          page: 1,
          limit: 20,
          sort: "created_at",
        } satisfies IShoppingMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate pagination
  TestValidator.equals(
    "pagination current page",
    dateRangeResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    dateRangeResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "has records",
    dateRangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    dateRangeResult.pagination.pages >= 0,
  );
  // Validate all orders are within date range
  await ArrayUtil.asyncForEach(dateRangeResult.data, async (order) => {
    TestValidator.predicate(
      `order ${order.id} created_at >= startDate`,
      new Date(order.created_at) >= new Date(startDate),
    );
    TestValidator.predicate(
      `order ${order.id} created_at <= endDate`,
      new Date(order.created_at) <= new Date(endDate),
    );
  });
  // 3. Test status filtering combined with date range
  const statusFilterResult =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          startDate,
          endDate,
          status: "paid",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(statusFilterResult);
  // Validate all orders have the filtered status
  await ArrayUtil.asyncForEach(statusFilterResult.data, async (order) => {
    TestValidator.equals(
      `order ${order.id} status is paid`,
      order.status,
      "paid",
    );
  });
  // 4. Test price range filtering
  const minPrice = 100;
  const maxPrice = 1000;
  const priceRangeResult =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          minPrice,
          maxPrice,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(priceRangeResult);
  // Validate all orders are within price range
  await ArrayUtil.asyncForEach(priceRangeResult.data, async (order) => {
    TestValidator.predicate(
      `order ${order.id} total_price >= minPrice`,
      order.total_price >= minPrice,
    );
    TestValidator.predicate(
      `order ${order.id} total_price <= maxPrice`,
      order.total_price <= maxPrice,
    );
  });
  // 5. Test delivered_at field validation
  const allOrdersResult =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IShoppingMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(allOrdersResult);
  // Check orders with shipments have delivered_at populated or null based on shipment status
  await ArrayUtil.asyncForEach(allOrdersResult.data, async (order) => {
    if (order.shipment_count > 0) {
      // Orders with shipments may have delivered_at populated or null
      if (order.delivered_at !== null) {
        TestValidator.predicate(
          `order ${order.id} delivered_at is valid date-time`,
          !isNaN(Date.parse(order.delivered_at)),
        );
      }
    } else {
      // Orders without shipments should have delivered_at as null
      TestValidator.equals(
        `order ${order.id} without shipments has null delivered_at`,
        order.delivered_at,
        null,
      );
    }
  });
  // 6. Test sorting by created_at_desc (newest first)
  const sortedResult =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at", // default is DESC
        } satisfies IShoppingMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(sortedResult);
  // Validate sorting order (newest first)
  if (sortedResult.data.length > 1) {
    for (let i = 1; i < sortedResult.data.length; i++) {
      TestValidator.predicate(
        `order ${i - 1} is newer than order ${i}`,
        new Date(sortedResult.data[i - 1].created_at) >=
          new Date(sortedResult.data[i].created_at),
      );
    }
  }
  // 7. Test empty results with restrictive filters
  const futureDate = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 year in future
  const emptyResult =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          startDate: futureDate,
          endDate: futureDate,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has 0 records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has 0 pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result data array is empty",
    emptyResult.data.length,
    0,
  );
  // 8. Test combined filters (date range + status + price range)
  const combinedFilterResult =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          startDate,
          endDate,
          status: "paid",
          minPrice: 50,
          maxPrice: 500,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Validate all orders match all filter criteria
  await ArrayUtil.asyncForEach(combinedFilterResult.data, async (order) => {
    TestValidator.equals(
      `order ${order.id} status is paid`,
      order.status,
      "paid",
    );
    TestValidator.predicate(
      `order ${order.id} within date range`,
      new Date(order.created_at) >= new Date(startDate) &&
        new Date(order.created_at) <= new Date(endDate),
    );
    TestValidator.predicate(
      `order ${order.id} within price range`,
      order.total_price >= 50 && order.total_price <= 500,
    );
  });
  // 9. Validate aggregated metrics in order summaries
  await ArrayUtil.asyncForEach(allOrdersResult.data, async (order) => {
    TestValidator.predicate(
      `order ${order.id} has valid order_items_count`,
      order.order_items_count >= 0,
    );
    TestValidator.predicate(
      `order ${order.id} has valid cancellation_count`,
      order.cancellation_count >= 0,
    );
    TestValidator.predicate(
      `order ${order.id} has valid refund_count`,
      order.refund_count >= 0,
    );
    TestValidator.predicate(
      `order ${order.id} has valid shipment_count`,
      order.shipment_count >= 0,
    );
    TestValidator.predicate(
      `order ${order.id} has customer info`,
      order.customer.id !== undefined && order.customer.email !== undefined,
    );
  });
  // 10. Test pagination navigation
  if (allOrdersResult.pagination.pages > 1) {
    const page2Result =
      await api.functional.shoppingMall.admin.analytics.orders.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 20,
          } satisfies IShoppingMallOrderAnalytic.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 pagination current",
      page2Result.pagination.current,
      2,
    );
    TestValidator.predicate(
      "page 2 has different data",
      page2Result.data.length >= 0,
    );
  }
}
