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

export async function test_api_customer_order_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account with generic order history
  const customerConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: joinInput,
  });
  typia.assert(customerAuth);
  // 2. Create a new connection with the token
  const token = customerAuth.token;
  const customerTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: `Bearer ${token.access}`,
    },
  };
  // 3. Create many orders to test pagination (55 orders for 6 pages with limit 10)
  const numOrders = 55;
  for (let i = 0; i < numOrders; i++) {
    await api.functional.ecommerceMall.customer.orders.index(
      customerTokenConnection,
      {
        body: { page: 1, limit: 100 },
      },
    );
  }
  // 4. Test pagination with limit=10
  const limit = 10;
  const firstPage = await api.functional.ecommerceMall.customer.orders.index(
    customerTokenConnection,
    {
      body: { limit },
    },
  );
  typia.assert(firstPage);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "first page records match total",
    firstPage.pagination.records,
    numOrders,
  );
  TestValidator.equals(
    "first page limit is correct",
    firstPage.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "first page pages count",
    firstPage.pagination.pages,
    Math.ceil(numOrders / limit),
  );
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page data length", firstPage.data.length, limit);
  // 6. Test second page
  const secondPage = await api.functional.ecommerceMall.customer.orders.index(
    customerTokenConnection,
    {
      body: { page: 2, limit },
    },
  );
  typia.assert(secondPage);
  // 7. Validate second page has different orders
  const firstPageIds = firstPage.data.map((o) => o.id);
  const secondPageIds = secondPage.data.map((o) => o.id);
  const hasDifferentOrders = secondPageIds.every((id) => !firstPageIds.includes(id));
  TestValidator.predicate("second page has different orders", hasDifferentOrders);
  // 8. Test page beyond available pages
  const beyondPage = await api.functional.ecommerceMall.customer.orders.index(
    customerTokenConnection,
    {
      body: { page: firstPage.pagination.pages + 1, limit },
    },
  );
  TestValidator.equals("beyond page data is empty", beyondPage.data.length, 0);
  // 9. Test default limit when omitted
  const defaultLimitPage =
    await api.functional.ecommerceMall.customer.orders.index(
      customerTokenConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultLimitPage);
  TestValidator.equals(
    "default limit is 20",
    defaultLimitPage.pagination.limit,
    20,
  );
}