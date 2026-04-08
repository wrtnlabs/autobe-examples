import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_history_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Get all orders for the customer (base case - no filters)
  const allOrders = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 0,
        limit: 100,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(allOrders);
  // 3. Test date range filtering with created_at_from
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const filteredOrdersFrom =
    await api.functional.ecommerce.customer.orders.index(customerConnection, {
      body: {
        page: 0,
        limit: 100,
        created_at_from: thirtyDaysAgo.toISOString(),
      } satisfies IEcommerceOrder.IRequest,
    });
  typia.assert(filteredOrdersFrom);
  // 4. Test date range filtering with created_at_to
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const filteredOrdersTo = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 0,
        limit: 100,
        created_at_to: thirtyDaysFromNow.toISOString(),
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(filteredOrdersTo);
  // 5. Test combined date range filtering
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 60);
  const filteredOrdersRange =
    await api.functional.ecommerce.customer.orders.index(customerConnection, {
      body: {
        page: 0,
        limit: 100,
        created_at_from: oneMonthAgo.toISOString(),
        created_at_to: thirtyDaysFromNow.toISOString(),
      } satisfies IEcommerceOrder.IRequest,
    });
  typia.assert(filteredOrdersRange);
  // 6. Validate that all returned orders belong to the customer
  for (const order of filteredOrdersFrom.data) {
    TestValidator.equals(
      "order belongs to customer",
      order.customer.id,
      customer.id,
    );
  }
  for (const order of filteredOrdersTo.data) {
    TestValidator.equals(
      "order belongs to customer",
      order.customer.id,
      customer.id,
    );
  }
  for (const order of filteredOrdersRange.data) {
    TestValidator.equals(
      "order belongs to customer",
      order.customer.id,
      customer.id,
    );
  }
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is valid",
    filteredOrdersFrom.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    filteredOrdersFrom.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    filteredOrdersFrom.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    filteredOrdersFrom.pagination.pages >= 0,
  );
  // 8. Validate that filtered results are subsets of all orders
  const allOrderIds = new Set(allOrders.data.map((o) => o.id));
  for (const order of filteredOrdersFrom.data) {
    TestValidator.predicate("order in all orders", allOrderIds.has(order.id));
  }
  // 9. Validate date range filtering logic - all orders in filteredFrom should be >= thirtyDaysAgo
  for (const order of filteredOrdersFrom.data) {
    const orderDate = new Date(order.created_at);
    TestValidator.predicate(
      "order created after filter date",
      orderDate >= thirtyDaysAgo,
    );
  }
  // 10. Validate date range filtering logic - all orders in filteredTo should be <= thirtyDaysFromNow
  for (const order of filteredOrdersTo.data) {
    const orderDate = new Date(order.created_at);
    TestValidator.predicate(
      "order created before filter date",
      orderDate <= thirtyDaysFromNow,
    );
  }
  // 11. Validate combined date range filtering
  for (const order of filteredOrdersRange.data) {
    const orderDate = new Date(order.created_at);
    TestValidator.predicate(
      "order created after from date",
      orderDate >= oneMonthAgo,
    );
    TestValidator.predicate(
      "order created before to date",
      orderDate <= thirtyDaysFromNow,
    );
  }
}
