import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_seller_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Setup: Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Setup: Create multiple orders as customer (one for each refund request)
  const order1 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order1);
  const order2 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order2);
  const order3 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order3);
  // 4. Setup: Create refund request 1
  const refundRequest1 =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order1.orderItems[0].id,
          reason: "Product defective - first request",
        },
      },
    );
  typia.assert(refundRequest1);
  const requestedAt1 = refundRequest1.requestedAt;
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Setup: Create refund request 2
  const refundRequest2 =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order2.orderItems[0].id,
          reason: "Changed mind - second request",
        },
      },
    );
  typia.assert(refundRequest2);
  const requestedAt2 = refundRequest2.requestedAt;
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Setup: Create refund request 3
  const refundRequest3 =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order3.orderItems[0].id,
          reason: "Still waiting - third request",
        },
      },
    );
  typia.assert(refundRequest3);
  const requestedAt3 = refundRequest3.requestedAt;
  // 7. Test: Filter by requestedAt range (should include all 3 requests)
  const allRequestsFilter = {
    requestedAtFrom: requestedAt1,
    requestedAtTo: new Date(Date.now() + 86400000).toISOString(), // tomorrow
  };
  const allRequestsResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      { body: allRequestsFilter },
    );
  typia.assert(allRequestsResult);
  TestValidator.equals(
    "all requests in date range",
    allRequestsResult.data.length,
    3,
  );
  // 8. Test: Filter by requestedAt range (only request 2 and 3)
  const recentRequestsFilter = {
    requestedAtFrom: requestedAt2,
    requestedAtTo: new Date(Date.now() + 86400000).toISOString(),
  };
  const recentRequestsResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      { body: recentRequestsFilter },
    );
  typia.assert(recentRequestsResult);
  TestValidator.equals(
    "recent requests in date range",
    recentRequestsResult.data.length,
    2,
  );
  // 9. Test: Filter by respondedAt range (all requests are pending, so should return empty)
  const respondedRequestsFilter = {
    respondedAtFrom: requestedAt1,
    respondedAtTo: new Date(Date.now() + 86400000).toISOString(),
  };
  const respondedRequestsResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      { body: respondedRequestsFilter },
    );
  typia.assert(respondedRequestsResult);
  TestValidator.equals(
    "pending requests excluded from responded_at filter",
    respondedRequestsResult.data.length,
    0,
  );
  // 10. Test: Filter by status (pending)
  const pendingFilter = {
    status: "pending",
  };
  const pendingResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResult);
  TestValidator.equals(
    "all requests are pending",
    pendingResult.data.length,
    3,
  );
  // 11. Test: Combined filters (status + requestedAt range)
  const combinedFilter = {
    status: "pending",
    requestedAtFrom: requestedAt2,
    requestedAtTo: new Date(Date.now() + 86400000).toISOString(),
  };
  const combinedResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filters work correctly",
    combinedResult.data.length,
    2,
  );
  // 12. Test: Invalid date range (from > to)
  const invalidRangeFilter = {
    requestedAtFrom: requestedAt3, // later date
    requestedAtTo: requestedAt1, // earlier date
  };
  const invalidRangeResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      { body: invalidRangeFilter },
    );
  typia.assert(invalidRangeResult);
  TestValidator.equals(
    "invalid date range returns empty results",
    invalidRangeResult.data.length,
    0,
  );
  // 13. Test: Pagination with date filters
  const paginatedFilter = {
    requestedAtFrom: requestedAt1,
    requestedAtTo: new Date(Date.now() + 86400000).toISOString(),
    page: 1,
    limit: 2,
  };
  const paginatedResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      { body: paginatedFilter },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination metadata correct",
    paginatedResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    paginatedResult.pagination.pages,
    2,
  );
}
