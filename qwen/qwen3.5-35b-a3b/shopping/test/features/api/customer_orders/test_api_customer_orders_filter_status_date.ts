import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_orders_filter_status_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Query all orders without filter to get baseline
  const allOrders = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(allOrders);
  // 3. Test status filter - query with status='paid'
  const paidOrders = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "paid",
      },
    },
  );
  typia.assert(paidOrders);
  // 4. Test date range filter
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const recentOrders = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        created_since: oneHourAgo.toISOString(),
        created_before: now.toISOString(),
      },
    },
  );
  typia.assert(recentOrders);
  // 5. Test combined filters - status + date range
  const combinedOrders =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "paid",
          created_since: twoDaysAgo.toISOString(),
        },
      },
    );
  typia.assert(combinedOrders);
  // 6. Test sort by total_price descending
  const sortedOrders = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        sort: "total_price",
      },
    },
  );
  typia.assert(sortedOrders);
  // Validation
  TestValidator.equals(
    "all orders count",
    allOrders.data.length,
    allOrders.pagination.records,
  );
  TestValidator.predicate(
    "paid orders filter works - all returned orders are paid",
    paidOrders.data.every(
      (order: IEcommerceMallOrder.ISummary) => order.status === "paid",
    ),
  );
  TestValidator.predicate(
    "date range filter works - all returned orders are within range",
    recentOrders.data.every((order: IEcommerceMallOrder.ISummary) => {
      const createdAt = new Date(order.created_at);
      return createdAt >= oneHourAgo && createdAt <= now;
    }),
  );
  TestValidator.predicate(
    "combined filters work - status and date range",
    combinedOrders.data.every(
      (order: IEcommerceMallOrder.ISummary) =>
        order.status === "paid" && new Date(order.created_at) >= twoDaysAgo,
    ),
  );
  TestValidator.predicate(
    "sort by total_price descending works",
    sortedOrders.data.length <= 1 ||
      sortedOrders.data.every(
        (order: IEcommerceMallOrder.ISummary, i: number) => {
          if (i === 0) return true;
          return order.total_price <= sortedOrders.data[i - 1]!.total_price;
        },
      ),
  );
}
