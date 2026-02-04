import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalesOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalesOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import type { IShoppingMallSalesOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_orders_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, { body: {} });
  // Get all orders for customer
  const allOrders: IPageIShoppingMallSalesOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          customer_id: customer.id,
          status: undefined,
          min_created_at: undefined,
          max_created_at: undefined,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSalesOrder.IRequest,
      },
    );
  typia.assert(allOrders);
  // Validate basic pagination structure
  TestValidator.equals(
    "all orders pagination current",
    allOrders.pagination.current,
    1,
  );
  TestValidator.equals(
    "all orders pagination limit",
    allOrders.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "all orders have records greater than 0",
    allOrders.pagination.records > 0,
  );
  // Get orders with active status filter
  const activeOrders: IPageIShoppingMallSalesOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          customer_id: customer.id,
          status: "active",
          min_created_at: undefined,
          max_created_at: undefined,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSalesOrder.IRequest,
      },
    );
  typia.assert(activeOrders);
  // Get orders within date range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);
  const ordersInRange: IPageIShoppingMallSalesOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          customer_id: customer.id,
          status: undefined,
          min_created_at: startDate.toISOString(),
          max_created_at: endDate.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSalesOrder.IRequest,
      },
    );
  typia.assert(ordersInRange);
  // Verify empty result for non-matching filters (status)
  const emptyResult: IPageIShoppingMallSalesOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          customer_id: customer.id,
          status: "canceled",
          min_created_at: undefined,
          max_created_at: undefined,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSalesOrder.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
}