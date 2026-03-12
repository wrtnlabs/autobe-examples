import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test cancellation snapshot filtering and pagination functionality.
 *
 * This test validates that customers can filter and paginate their cancellation
 * snapshots using various filter criteria including pagination parameters,
 * sorting options, status filters, date range filters, and order ID filters.
 */
export async function test_api_cancellation_snapshot_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // ========== SETUP PHASE ==========
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Customer creates first order
  const firstOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(firstOrder);
  TestValidator.predicate(
    "first order has items",
    firstOrder.orderItems.length > 0,
  );
  // 4. Customer creates first cancellation request for first order item
  const firstCancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: firstOrder.orderItems[0].id,
          reason: "Changed my mind",
        },
      },
    );
  typia.assert(firstCancellationRequest);
  // 5. Seller approves first cancellation request (creates first snapshot)
  const approvedFirstRequest =
    await api.functional.shoppingMall.seller.cancellationRequests.update(
      sellerConnection,
      {
        cancellationRequestId: firstCancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedFirstRequest);
  TestValidator.equals(
    "first request approved",
    approvedFirstRequest.status,
    "approved",
  );
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 6. Customer creates second order
  const secondOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(secondOrder);
  TestValidator.predicate(
    "second order has items",
    secondOrder.orderItems.length > 0,
  );
  // 7. Customer creates second cancellation request
  const secondCancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: secondOrder.orderItems[0].id,
          reason: "Wrong item selected",
        },
      },
    );
  typia.assert(secondCancellationRequest);
  // 8. Seller approves second cancellation request (creates second snapshot)
  const approvedSecondRequest =
    await api.functional.shoppingMall.seller.cancellationRequests.update(
      sellerConnection,
      {
        cancellationRequestId: secondCancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedSecondRequest);
  TestValidator.equals(
    "second request approved",
    approvedSecondRequest.status,
    "approved",
  );
  // ========== TEST PHASE ==========
  // Test 1: Pagination Test (page=1, limit=1)
  const page1Result =
    await api.functional.shoppingMall.customer.cancellationSnapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "pagination test - total records",
    page1Result.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination test - total pages",
    page1Result.pagination.pages,
    2,
  );
  TestValidator.equals(
    "pagination test - current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination test - data length",
    page1Result.data.length,
    1,
  );
  // Test 2: Second Page Test (page=2, limit=1)
  const page2Result =
    await api.functional.shoppingMall.customer.cancellationSnapshots.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "second page test - current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page test - data length",
    page2Result.data.length,
    1,
  );
  // Test 3: Sort Descending Test (sortBy='createdAt', sortOrder='desc')
  const sortDescResult =
    await api.functional.shoppingMall.customer.cancellationSnapshots.index(
      customerConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(sortDescResult);
  TestValidator.predicate(
    "sort desc test - newest first",
    sortDescResult.data[0].createdAt >= sortDescResult.data[1].createdAt,
  );
  // Test 4: Sort Ascending Test (sortBy='createdAt', sortOrder='asc')
  const sortAscResult =
    await api.functional.shoppingMall.customer.cancellationSnapshots.index(
      customerConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "asc",
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(sortAscResult);
  TestValidator.predicate(
    "sort asc test - oldest first",
    sortAscResult.data[0].createdAt <= sortAscResult.data[1].createdAt,
  );
  // Test 5: Status Filter Test (status='approved')
  const statusFilterResult =
    await api.functional.shoppingMall.customer.cancellationSnapshots.index(
      customerConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(statusFilterResult);
  TestValidator.predicate(
    "status filter test - all approved",
    statusFilterResult.data.every(
      (snapshot) => snapshot.cancellationRequestId !== null,
    ),
  );
  TestValidator.equals(
    "status filter test - count",
    statusFilterResult.data.length,
    2,
  );
  // Test 6: Date Range Test (dateRange.from)
  const firstSnapshotCreatedAt = sortAscResult.data[0].createdAt;
  const dateRangeResult =
    await api.functional.shoppingMall.customer.cancellationSnapshots.index(
      customerConnection,
      {
        body: {
          dateRange: {
            from: firstSnapshotCreatedAt,
          },
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range test - both snapshots returned",
    dateRangeResult.data.length,
    2,
  );
  // Test 7: Order ID Filter Test (orderId)
  const orderIdFilterResult =
    await api.functional.shoppingMall.customer.cancellationSnapshots.index(
      customerConnection,
      {
        body: {
          orderId: firstOrder.id,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(orderIdFilterResult);
  TestValidator.equals(
    "order id filter test - only first snapshot",
    orderIdFilterResult.data.length,
    1,
  );
  TestValidator.predicate(
    "order id filter test - correct cancellation request",
    orderIdFilterResult.data[0].cancellationRequestId ===
      firstCancellationRequest.id,
  );
}
