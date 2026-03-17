import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller orders filtering by status.
 * 1) Authenticate as a seller
 * 2) Call the orders endpoint with status filter set to "paid"
 * 3) Verify response contains orders filtered by paid status
 * 4) Call endpoint with status filter set to "shipped"
 * 5) Verify response contains orders filtered by shipped status
 * 6) Test with no status filter to ensure all orders are returned regardless of status
 * 7) Validate that status exact match filtering works correctly and empty result sets are handled properly
 */
export async function test_api_seller_order_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection (authentication)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://test.com/signup",
      referrer: "https://test.com",
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Test with status filter "paid"
  const paidOrders: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: {
        status: "paid",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(paidOrders);
  // Validate that all returned orders have paid status
  for (const order of paidOrders.data) {
    if (order.status !== "paid") {
      throw new Error(
        `Expected order ${order.id} to have status "paid", but got "${order.status}"`,
      );
    }
  }
  // 3. Test with status filter "shipped"
  const shippedOrders: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: {
        status: "shipped",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(shippedOrders);
  // Validate that all returned orders have shipped status
  for (const order of shippedOrders.data) {
    if (order.status !== "shipped") {
      throw new Error(
        `Expected order ${order.id} to have status "shipped", but got "${order.status}"`,
      );
    }
  }
  // 4. Test with no status filter (null) - returns all orders
  const allOrders: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: {
        status: null,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(allOrders);
  // 5. Test with "delivered" status filter
  const deliveredOrders: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: {
        status: "delivered",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(deliveredOrders);
  for (const order of deliveredOrders.data) {
    if (order.status !== "delivered") {
      throw new Error(
        `Expected order ${order.id} to have status "delivered", but got "${order.status}"`,
      );
    }
  }
  // 6. Test with "cancelled" status filter
  const cancelledOrders: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: {
        status: "cancelled",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(cancelledOrders);
  for (const order of cancelledOrders.data) {
    if (order.status !== "cancelled") {
      throw new Error(
        `Expected order ${order.id} to have status "cancelled", but got "${order.status}"`,
      );
    }
  }
  // 7. Test with "refunded" status filter
  const refundedOrders: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: {
        status: "refunded",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(refundedOrders);
  for (const order of refundedOrders.data) {
    if (order.status !== "refunded") {
      throw new Error(
        `Expected order ${order.id} to have status "refunded", but got "${order.status}"`,
      );
    }
  }
  // 8. Test with "partially_completed" status filter
  const partiallyCompletedOrders: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: {
        status: "partially_completed",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(partiallyCompletedOrders);
  for (const order of partiallyCompletedOrders.data) {
    if (order.status !== "partially_completed") {
      throw new Error(
        `Expected order ${order.id} to have status "partially_completed", but got "${order.status}"`,
      );
    }
  }
}
