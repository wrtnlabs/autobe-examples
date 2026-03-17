import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * Test customer order history filtering by derived order status.
 *
 * Validates the PATCH /shoppingMall/customer/orders endpoint accepts status filters
 * and returns properly structured paginated order summaries. Tests all status values:
 * PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED, PARTIALLY_COMPLETED.
 *
 * Note: Order creation endpoints are not available in provided API functions.
 * This test validates the filtering API structure and parameter acceptance.
 */
export async function test_api_customer_order_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string,
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>() satisfies string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string,
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Test order listing with no filters (baseline)
  const baselineOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(baselineOrders);
  TestValidator.predicate(
    "has pagination",
    baselineOrders.pagination.records >= 0,
  );
  // 3. Test filtering by PAID status
  const paidOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
        status: "PAID",
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(paidOrders);
  TestValidator.predicate(
    "PAID filter returns pagination",
    paidOrders.pagination.records >= 0,
  );
  // 4. Test filtering by DELIVERED status
  const deliveredOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "DELIVERED",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(deliveredOrders);
  TestValidator.predicate(
    "DELIVERED filter returns pagination",
    deliveredOrders.pagination.records >= 0,
  );
  // 5. Test filtering by PARTIALLY_COMPLETED status
  const partialOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
        status: "PARTIALLY_COMPLETED",
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(partialOrders);
  TestValidator.predicate(
    "PARTIALLY_COMPLETED filter returns pagination",
    partialOrders.pagination.records >= 0,
  );
  // 6. Test filtering by CANCELLED status
  const cancelledOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "CANCELLED",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(cancelledOrders);
  TestValidator.predicate(
    "CANCELLED filter returns pagination",
    cancelledOrders.pagination.records >= 0,
  );
  // 7. Test filtering by REFUNDED status
  const refundedOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "REFUNDED",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(refundedOrders);
  TestValidator.predicate(
    "REFUNDED filter returns pagination",
    refundedOrders.pagination.records >= 0,
  );
  // 8. Test filtering by SHIPPED status
  const shippedOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
        status: "SHIPPED",
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(shippedOrders);
  TestValidator.predicate(
    "SHIPPED filter returns pagination",
    shippedOrders.pagination.records >= 0,
  );
  // 9. Test combined filters (status + date range)
  const combinedOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "DELIVERED",
          fromDate: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          toDate: new Date().toISOString(),
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(combinedOrders);
  TestValidator.predicate(
    "combined filters return pagination",
    combinedOrders.pagination.records >= 0,
  );
}
