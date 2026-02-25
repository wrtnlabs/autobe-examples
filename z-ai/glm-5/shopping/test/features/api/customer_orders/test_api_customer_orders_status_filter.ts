import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test that customers can filter their order history by status.
 *
 * This test validates:
 * - Status filter performs exact match filtering
 * - All returned orders match the requested status
 * - Empty results return valid pagination structure
 * - Pagination reflects only filtered order count
 */
export async function test_api_customer_orders_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_customer_join(customerConnection, {});
  typia.assert(auth);
  // 2. Create multiple orders with 'paid' status
  const orderCount = 3;
  const createdOrders: IShoppingMallOrder[] = [];
  for (let i = 0; i < orderCount; i++) {
    const order = await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {},
    );
    typia.assert(order);
    createdOrders.push(order);
  }
  // 3. Test filtering by 'paid' status - should return all created orders
  const paidOrdersResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "paid",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(paidOrdersResponse);
  // Verify all returned orders have 'paid' status
  TestValidator.predicate(
    "all filtered orders have 'paid' status",
    paidOrdersResponse.data.every((order) => order.status === "paid"),
  );
  // Verify pagination reflects filtered count
  TestValidator.predicate(
    "pagination records matches filtered orders count",
    paidOrdersResponse.pagination.records >= orderCount,
  );
  // 4. Test filtering by 'delivered' status - should return empty array
  const deliveredOrdersResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "delivered",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(deliveredOrdersResponse);
  // Verify empty results have valid pagination structure
  TestValidator.equals(
    "delivered orders data is empty",
    deliveredOrdersResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is zero for delivered",
    deliveredOrdersResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero for delivered",
    deliveredOrdersResponse.pagination.pages,
    0,
  );
  // 5. Test without status filter - should return all orders
  const allOrdersResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(allOrdersResponse);
  // Verify unfiltered count includes all created orders
  TestValidator.predicate(
    "unfiltered results include all created orders",
    allOrdersResponse.pagination.records >= orderCount,
  );
  // 6. Test pagination with limit parameter
  const paginatedResponse =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "paid",
          limit: 2,
          page: 1,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "paginated results respect limit",
    paginatedResponse.data.length <= 2,
  );
  TestValidator.equals(
    "current page is 1",
    paginatedResponse.pagination.current,
    1,
  );
}
