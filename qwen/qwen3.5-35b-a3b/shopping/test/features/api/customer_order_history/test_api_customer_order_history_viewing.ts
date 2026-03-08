import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_customer_order_history_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first customer
  const customerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string>(),
      password: "1234",
      href: typia.random<string>(),
      referrer: typia.random<string>(),
      ip: typia.random<string>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(firstCustomer);
  // 2. Test default sorting (created_at DESC)
  const defaultPage = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(defaultPage);
  // 3. Test pagination with different page and limit
  const page2Limited = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 10,
      },
    },
  );
  typia.assert(page2Limited);
  // 4. Test status filtering
  const paidOrders = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "paid",
      },
    },
  );
  typia.assert(paidOrders);
  // 5. Test date range filtering
  const now = new Date();
  const endDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
  const dateRange = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
      },
    },
  );
  typia.assert(dateRange);
  // 6. Test text search by order number
  const searchOrder = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        searchTerm: "ORD",
      },
    },
  );
  typia.assert(searchOrder);
  // 7. Test sorting by total_price ascending
  const priceAsc = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        sortBy: "total_price",
        sortOrder: "ASC",
      },
    },
  );
  typia.assert(priceAsc);
  // 8. Test sorting by total_price descending
  const priceDesc = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        sortBy: "total_price",
        sortOrder: "DESC",
      },
    },
  );
  typia.assert(priceDesc);
  // 9. Validate pagination metadata exists and has correct types
  TestValidator.predicate(
    "pagination metadata has current page",
    typeof defaultPage.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination metadata has limit",
    typeof defaultPage.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination metadata has records count",
    typeof defaultPage.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination metadata has pages count",
    typeof defaultPage.pagination.pages === "number",
  );
  // 10. Validate response data items have required fields
  if (defaultPage.data.length > 0) {
    const firstOrder = defaultPage.data[0];
    typia.assert(firstOrder);
    TestValidator.equals(
      "order has order_number",
      firstOrder.order_number,
      "string" as any,
    );
    TestValidator.equals(
      "order has total_price",
      typeof firstOrder.total_price,
      "number",
    );
    TestValidator.equals(
      "order has overall_status",
      typeof firstOrder.overall_status,
      "string",
    );
    TestValidator.equals(
      "order has created_at",
      typeof firstOrder.created_at,
      "string",
    );
  }
  // 11. Test data isolation - create second customer
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomer = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: {
        email: typia.random<string>(),
        password: "1234",
        href: typia.random<string>(),
        referrer: typia.random<string>(),
        ip: typia.random<string>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(secondCustomer);
  const secondCustomerOrders =
    await api.functional.ecommerceMall.customer.orders.index(
      secondCustomerConnection,
      {
        body: {},
      },
    );
  typia.assert(secondCustomerOrders);
  // 12. Verify data isolation - customers should have different order lists
  const allOrderIds = defaultPage.data.map((o) => o.id);
  const secondOrderIds = secondCustomerOrders.data.map((o) => o.id);
  const overlap = allOrderIds.filter((id) => secondOrderIds.includes(id));
  TestValidator.equals(
    "no order ID overlap between customers",
    overlap.length,
    0,
  );
  // 13. Validate pagination calculations are consistent
  if (defaultPage.data.length > 0) {
    const expectedPages = Math.ceil(
      defaultPage.pagination.records / defaultPage.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation",
      defaultPage.pagination.pages,
      expectedPages,
    );
  }
  // 14. Test limit bounds validation
  const limitedPage = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        limit: 1,
      },
    },
  );
  typia.assert(limitedPage);
  TestValidator.equals(
    "limited page returns at most limit items",
    limitedPage.pagination.limit,
    1,
  );
}