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

export async function test_api_customer_order_history_filtered_by_status_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
        password: "12345678",
        name: RandomGenerator.name(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Create orders with different statuses and dates
  const now = new Date();
  const dateOffset = 1000 * 60 * 60 * 24; // 1 day
  const order1 = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        order_status: ["paid"],
        created_at_start: new Date(
          now.getTime() - dateOffset * 5,
        ).toISOString(),
        created_at_end: new Date(now.getTime() - dateOffset * 4).toISOString(),
        limit: 100,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(order1);
  const order2 = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        order_status: ["shipped"],
        created_at_start: new Date(
          now.getTime() - dateOffset * 3,
        ).toISOString(),
        created_at_end: new Date(now.getTime() - dateOffset * 2).toISOString(),
        limit: 100,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(order2);
  const order3 = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        order_status: ["delivered"],
        created_at_start: new Date(
          now.getTime() - dateOffset * 1,
        ).toISOString(),
        created_at_end: new Date(now.getTime() + dateOffset).toISOString(),
        limit: 100,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(order3);
  // 3. Test status filter: "paid" and "shipped"
  const filteredByStatus =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          order_status: ["paid", "shipped"],
          limit: 100,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(filteredByStatus);
  TestValidator.equals("status filter count", filteredByStatus.data.length, 2);
  const statusValues = filteredByStatus.data.map((o) => o.order_status);
  TestValidator.predicate(
    "contains paid and shipped",
    statusValues.includes("paid") && statusValues.includes("shipped"),
  );
  // 4. Test date range filter
  const filteredByDate =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          created_at_start: new Date(
            now.getTime() - dateOffset * 3,
          ).toISOString(),
          created_at_end: new Date(
            now.getTime() - dateOffset * 1,
          ).toISOString(),
          limit: 100,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(filteredByDate);
  TestValidator.predicate(
    "date range filter includes expected orders",
    filteredByDate.data.length >= 2,
  );
  // 5. Test combined filters: status + date range + price
  const combined = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        order_status: ["paid"],
        created_at_start: new Date(
          now.getTime() - dateOffset * 5,
        ).toISOString(),
        created_at_end: new Date(now.getTime() - dateOffset * 4).toISOString(),
        total_price_min: 0,
        total_price_max: 1000000,
        limit: 100,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(combined);
  TestValidator.equals("combined filter", combined.data.length, 1);
  // 6. Test empty result for non-matching filters
  const noMatch = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        order_status: ["cancelled"],
        created_at_start: new Date(
          now.getTime() - dateOffset * 10,
        ).toISOString(),
        created_at_end: new Date(now.getTime() - dateOffset * 9).toISOString(),
        limit: 100,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(noMatch);
  TestValidator.equals("empty result", noMatch.data.length, 0);
}