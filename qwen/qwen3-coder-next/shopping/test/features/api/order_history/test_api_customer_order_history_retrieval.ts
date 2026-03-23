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

export async function test_api_customer_order_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create first authenticated customer
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Join = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>() as string & tags.Format<"email"> & tags.MinLength<1>,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const customer1 = typia.assert(customer1Join.customer);
  // Create second authenticated customer for data isolation test
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Join = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>() as string & tags.Format<"email"> & tags.MinLength<1>,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const customer2 = typia.assert(customer2Join.customer);
  // Retrieve order history for customer1 (default pagination)
  const response1 = await api.functional.ecommerceMall.customer.orders.index(
    customer1Connection,
    {
      body: {},
    },
  );
  typia.assert(response1);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response1.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count",
    response1.pagination.records,
    response1.data.length,
  );
  // Validate data isolation - customer1 should only see their own orders
  response1.data.forEach((order) => {
    TestValidator.equals(
      "order customer ID matches",
      order.customer.id,
      customer1.id,
    );
  });
  // Validate order sorting (newest first)
  if (response1.data.length >= 2) {
    const dates = response1.data.map((o) => new Date(o.created_at).getTime());
    TestValidator.predicate("orders sorted by created_at DESC", () => {
      for (let i = 1; i < dates.length; i++) {
        if (dates[i - 1] < dates[i]) return false;
      }
      return true;
    });
  }
  // Validate required fields in order summary
  response1.data.forEach((order) => {
    typia.assert<string & tags.Format<"uuid">>(order.id);
    TestValidator.predicate(
      "total_price non-negative",
      () => order.total_price >= 0,
    );
    TestValidator.equals(
      "order_status valid",
      [
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
        "partiallyCompleted",
      ].includes(order.order_status),
      true,
    );
    typia.assert<IEcommerceMallCustomer.ISummary>(order.customer);
    typia.assert<IEcommerceMallAddress.ISummary>(order.shipping_address);
    typia.assert<string & tags.Format<"date-time">>(order.created_at);
    typia.assert<string & tags.Format<"date-time">>(order.updated_at);
  });
  // Test custom pagination
  const response2 = await api.functional.ecommerceMall.customer.orders.index(
    customer1Connection,
    {
      body: { page: 2, limit: 5 },
    },
  );
  typia.assert(response2);
  TestValidator.equals(
    "custom pagination current page",
    response2.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom pagination limit",
    response2.pagination.limit,
    5,
  );
  // Test data isolation - customer2 should only see their own orders
  const response3 = await api.functional.ecommerceMall.customer.orders.index(
    customer2Connection,
    {
      body: {},
    },
  );
  typia.assert(response3);
  response3.data.forEach((order) => {
    TestValidator.equals(
      "customer2 order customer ID",
      order.customer.id,
      customer2.id,
    );
  });
}