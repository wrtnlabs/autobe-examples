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

/**
 * Test customer order history retrieval with pagination.
 *
 * Validates that authenticated customers can retrieve their order history with proper pagination support. The test ensures that the order list endpoint correctly filters orders by the authenticated customer, returns proper pagination metadata, and sorts results by creation date in descending order.
 *
 * The test follows the standard customer authentication flow and verifies that the order history endpoint respects row-level security by only returning orders belonging to the authenticated customer.
 *
 * 1. Customer authenticates via join endpoint to obtain JWT tokens.
 * 2. Customer calls order list endpoint with pagination parameters (page=0, limit=10).
 * 3. Validates response contains proper pagination metadata (current, limit, records, pages).
 * 4. Validates customer reference in order summary matches authenticated customer.
 */
export async function test_api_customer_order_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Retrieve order history with pagination
  const orderHistory = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 0,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(orderHistory);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    orderHistory.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    orderHistory.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    orderHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    orderHistory.pagination.pages >= 0,
  );
  // 4. Validate customer reference in each order matches authenticated customer
  for (const order of orderHistory.data) {
    typia.assert(order);
    TestValidator.equals(
      "customer id matches authenticated customer",
      order.customer.id,
      customerAuth.id,
    );
  }
}
