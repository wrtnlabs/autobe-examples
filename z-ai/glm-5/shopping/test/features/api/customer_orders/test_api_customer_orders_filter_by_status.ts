import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEShoppingMallOrderStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEShoppingMallOrderStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_orders_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {});
  typia.assert(authResult);
  // 2. Test filtering by multiple status values ['paid', 'shipped']
  const paidShippedResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: ["paid", "shipped"] satisfies IEShoppingMallOrderStatus[],
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(paidShippedResponse);
  // Validate all returned orders have status 'paid' or 'shipped'
  for (const order of paidShippedResponse.data) {
    TestValidator.predicate(
      `Order ${order.order_number} has status paid or shipped`,
      order.status === "paid" || order.status === "shipped",
    );
  }
  // 3. Test filtering by single status value ['delivered']
  const deliveredResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: ["delivered"] satisfies IEShoppingMallOrderStatus[],
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(deliveredResponse);
  // Validate all returned orders have status 'delivered'
  for (const order of deliveredResponse.data) {
    TestValidator.equals(
      `Order ${order.order_number} has status delivered`,
      order.status,
      "delivered",
    );
  }
  // 4. Test filtering by cancelled status
  const cancelledResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: ["cancelled"] satisfies IEShoppingMallOrderStatus[],
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(cancelledResponse);
  for (const order of cancelledResponse.data) {
    TestValidator.equals(
      `Order ${order.order_number} has status cancelled`,
      order.status,
      "cancelled",
    );
  }
  // 5. Test with empty status array (no filtering)
  const allOrdersResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: [] satisfies IEShoppingMallOrderStatus[],
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(allOrdersResponse);
  // 6. Test without status filter (undefined) - should return all orders
  const noFilterResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(noFilterResponse);
  // 7. Test filtering by refunded status
  const refundedResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: ["refunded"] satisfies IEShoppingMallOrderStatus[],
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(refundedResponse);
  for (const order of refundedResponse.data) {
    TestValidator.equals(
      `Order ${order.order_number} has status refunded`,
      order.status,
      "refunded",
    );
  }
  // 8. Test filtering by multiple different status combinations
  const partialCompletedResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: ["partially_completed"] satisfies IEShoppingMallOrderStatus[],
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(partialCompletedResponse);
  for (const order of partialCompletedResponse.data) {
    TestValidator.equals(
      `Order ${order.order_number} has status partially_completed`,
      order.status,
      "partially_completed",
    );
  }
  // 9. Test with pagination and status filter combined
  const paginatedResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: [
            "paid",
            "shipped",
            "delivered",
          ] satisfies IEShoppingMallOrderStatus[],
          limit: 10,
          page: 1,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "Pagination current page is valid",
    paginatedResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "Pagination limit is valid",
    paginatedResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "Pagination records is valid",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Pagination pages is valid",
    paginatedResponse.pagination.pages >= 0,
  );
}
