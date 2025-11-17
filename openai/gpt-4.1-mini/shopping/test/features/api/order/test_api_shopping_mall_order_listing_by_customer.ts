import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the order listing and filtering functionality for a newly joined
 * authenticated customer.
 *
 * This test simulates the customer joining process, then authenticating and
 * retrieving a list of their orders applying filters, pagination, and sorting.
 * It validates that the retrieved page metadata and orders conform to expected
 * types and that all orders belong to the customer.
 *
 * Steps:
 *
 * 1. Register a new customer with email and password.
 * 2. Use authentication token for customer to query their order list.
 * 3. Perform order list queries with pagination (page, limit) and filtering
 *    (search text).
 * 4. Validate response structure for pagination and order summaries.
 * 5. Assert that all returned orders belong to the authenticated customer.
 */
export async function test_api_shopping_mall_order_listing_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "P@ssw0rd!";

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "https://example.com/signup",
        referrer: "https://example.com/home",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Prepare some search/filter/sort parameters for listing
  // Use page 1, limit 10, realistic search string derived from customer's email local part
  const searchString = customerEmail.split("@")[0];
  const page = 1;
  const limit = 10;
  const sortBy = "created_at";
  const sortOrder = "desc" as "asc" | "desc";

  // 3. Query the order list by the authenticated customer
  const orderList: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.index(connection, {
      body: {
        page,
        limit,
        search: searchString,
        sortBy,
        sortOrder,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(orderList);

  // 4. Validate pagination details
  TestValidator.predicate(
    "pagination current page is correct",
    orderList.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit per page is correct",
    orderList.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    orderList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is correct",
    orderList.pagination.pages >= 0,
  );

  // 5. Validate all orders belong to the authenticated customer
  for (const order of orderList.data) {
    typia.assert(order);
    TestValidator.equals(
      "order belongs to customer",
      order.shopping_mall_customer.id,
      customer.customer?.id ?? customer.id,
    );
    // Validate sort order is descending by created_at
    // These will be validated in sequence and could be compared
  }

  // 6. Validate sorting order of the results by created_at descending
  for (let i = 1; i < orderList.data.length; ++i) {
    const prev = orderList.data[i - 1];
    const curr = orderList.data[i];
    TestValidator.predicate(
      "ordering of created_at is descending",
      prev.created_at >= curr.created_at,
    );
  }
}
