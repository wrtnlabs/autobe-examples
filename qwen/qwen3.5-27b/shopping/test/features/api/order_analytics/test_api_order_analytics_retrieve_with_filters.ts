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
 * Test order analytics retrieval with various filters and pagination.
 *
 * This test verifies that authenticated administrators can retrieve order
 * analytics with date range filtering, status filtering, sorting, and
 * pagination. It validates the response structure, pagination metadata,
 * and filter functionality.
 */
export async function test_api_order_analytics_retrieve_with_filters(
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
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test basic retrieval without filters
  const basicResponse =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(basicResponse);
  TestValidator.equals(
    "basic pagination current page",
    basicResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "basic pagination limit",
    basicResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "basic pagination has non-negative records",
    basicResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "basic pagination has non-negative pages",
    basicResponse.pagination.pages >= 0,
  );
  // 3. Verify order analytics structure
  if (basicResponse.data.length > 0) {
    const order = basicResponse.data[0];
    typia.assert(order);
    TestValidator.predicate(
      "order has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        order.id,
      ),
    );
    TestValidator.predicate(
      "order has non-negative total price",
      order.total_price >= 0,
    );
    TestValidator.predicate("order has status", order.status !== "");
    TestValidator.predicate("order has created_at", order.created_at !== "");
    TestValidator.predicate("order has customer", order.customer !== null);
    TestValidator.predicate(
      "order has non-negative items count",
      order.order_items_count >= 0,
    );
    TestValidator.predicate(
      "order has non-negative cancellation count",
      order.cancellation_count >= 0,
    );
    TestValidator.predicate(
      "order has non-negative refund count",
      order.refund_count >= 0,
    );
    TestValidator.predicate(
      "order has non-negative shipment count",
      order.shipment_count >= 0,
    );
  }
  // 4. Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString(),
        } satisfies IShoppingMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  TestValidator.predicate(
    "date range filter returns valid pagination",
    dateRangeResponse.pagination.current >= 1,
  );
  // 5. Test status filtering
  const statusFilterResponse =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          status: "paid",
        } satisfies IShoppingMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(statusFilterResponse);
  // Verify all returned orders have the filtered status
  for (const order of statusFilterResponse.data) {
    TestValidator.equals("status filter applied", order.status, "paid");
  }
  // 6. Test sorting by created_at (descending - default)
  const sortCreatedDescResponse =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          sort: "created_at",
          limit: 10,
        } satisfies IShoppingMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(sortCreatedDescResponse);
  TestValidator.equals(
    "sort response limit",
    sortCreatedDescResponse.pagination.limit,
    10,
  );
  // 7. Test sorting by total_price (ascending)
  const sortPriceAscResponse =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          sort: "total_price",
          limit: 10,
        } satisfies IShoppingMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(sortPriceAscResponse);
  TestValidator.predicate(
    "price sort returns valid response",
    sortPriceAscResponse.pagination.current >= 1,
  );
  // 8. Test pagination (page 2)
  const page2Response =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 5);
  // 9. Test empty results with future date range
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const emptyResponse =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          startDate: farFuture.toISOString(),
          endDate: new Date(
            farFuture.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IShoppingMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty result records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResponse.pagination.pages, 0);
  TestValidator.equals(
    "empty result data length",
    emptyResponse.data.length,
    0,
  );
}
