import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
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

/**
 * Test customer order listing with pagination functionality.
 *
 * This test validates the primary success path for retrieving paginated order
 * summaries for an authenticated customer. It verifies that the order listing
 * endpoint correctly filters orders by customer, applies pagination, sorts by
 * creation date descending, and returns properly structured order summaries
 * with accurate pagination metadata.
 */
export async function test_api_customer_orders_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Request order list with default pagination (page=1, limit=20)
  const ordersPage = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(ordersPage);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", ordersPage.pagination.current, 1);
  TestValidator.equals("limit is 20", ordersPage.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    ordersPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    ordersPage.pagination.pages >= 0,
  );
  // 4. Validate orders data structure
  TestValidator.predicate(
    "orders array exists",
    Array.isArray(ordersPage.data),
  );
  // 5. Validate each order summary - business logic only
  await ArrayUtil.asyncForEach(ordersPage.data, async (order, index) => {
    // Validate business logic: total price is positive
    TestValidator.predicate(
      `order ${index} has positive total price`,
      order.total_price > 0,
    );
    // Validate business logic: item count is non-negative
    TestValidator.predicate(
      `order ${index} has non-negative item count`,
      order.order_items_count >= 0,
    );
    // Validate customer information matches authenticated customer
    TestValidator.equals(
      `order ${index} customer ID matches`,
      order.customer.id,
      authorized.id,
    );
    TestValidator.equals(
      `order ${index} customer email matches`,
      order.customer.email,
      authorized.email,
    );
    TestValidator.equals(
      `order ${index} customer display name matches`,
      order.customer.display_name,
      authorized.display_name,
    );
  });
  // 6. Validate sorting (created_at DESC - newest first)
  if (ordersPage.data.length > 1) {
    for (let i = 1; i < ordersPage.data.length; i++) {
      const currentOrder = ordersPage.data[i];
      const previousOrder = ordersPage.data[i - 1];
      TestValidator.predicate(
        `order ${i} is not newer than order ${i - 1}`,
        new Date(currentOrder.created_at).getTime() <=
          new Date(previousOrder.created_at).getTime(),
      );
    }
  }
  // 7. Validate pagination consistency
  const expectedPages =
    ordersPage.pagination.records === 0
      ? 0
      : Math.ceil(
          ordersPage.pagination.records /
            (ordersPage.pagination.limit === 0
              ? 1
              : ordersPage.pagination.limit),
        );
  TestValidator.equals(
    "pages calculation is correct",
    ordersPage.pagination.pages,
    expectedPages,
  );
  // 8. Validate data count is within limits
  TestValidator.predicate(
    "data count does not exceed limit",
    ordersPage.data.length <= ordersPage.pagination.limit,
  );
  TestValidator.predicate(
    "data count does not exceed total records",
    ordersPage.data.length <= ordersPage.pagination.records,
  );
}
