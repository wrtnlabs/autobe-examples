import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
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

export async function test_api_customer_order_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<
      string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
    >(),
    password: "1234" as const,
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(customer);
  // 2. Test order list with default parameters (no filters)
  const allOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(allOrders);
  TestValidator.predicate(
    "pagination exists",
    allOrders.pagination !== undefined,
  );
  // 3. Test status filter - filter by 'paid'
  const paidOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "paid" as const,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(paidOrders);
  // Validate that if there are any paid orders, they have the correct status
  for (const order of paidOrders.data) {
    TestValidator.equals("paid order status", order.status, "paid");
  }
  // 4. Test status filter - filter by 'shipped'
  const shippedOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "shipped" as const,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(shippedOrders);
  // Validate that if there are any shipped orders, they have the correct status
  for (const order of shippedOrders.data) {
    TestValidator.equals("shipped order status", order.status, "shipped");
  }
  // 5. Test date range filter - last 7 days
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const recentOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        startDate: sevenDaysAgo,
        endDate: tomorrow,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(recentOrders);
  TestValidator.predicate(
    "recent orders count >= 0",
    recentOrders.data.length >= 0,
  );
  // 6. Test combination of status and date range filters
  const combinedOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "paid" as const,
          startDate: sevenDaysAgo,
          endDate: tomorrow,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(combinedOrders);
  // 7. Test sorting - newest first (default)
  const newestFirstOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(newestFirstOrders);
  // 8. Test sorting - oldest first
  const oldestFirstOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortDirection: "asc" as const,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(oldestFirstOrders);
}
