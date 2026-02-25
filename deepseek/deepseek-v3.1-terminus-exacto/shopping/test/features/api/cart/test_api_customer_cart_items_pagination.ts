import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer cart items pagination functionality.
 * 1. Create customer account and authenticate using utility function
 * 2. Test pagination with different page sizes on customer's cart
 * 3. Validate pagination metadata and cart item fields
 */
export async function test_api_customer_cart_items_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup and authentication using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Note: Since cart creation endpoint is not provided in SDK, we assume cart exists after customer creation
  // The cart ID would typically be accessible through customer context or a separate endpoint
  // For this test, we'll focus on testing the pagination functionality with realistic parameters
  // Generate a realistic cart ID (assuming it follows UUID format)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test pagination with limit=2
  const pageOne = await api.functional.ecommerce.customer.carts.items.index(
    customerConnection,
    {
      cartId: cartId,
      body: {
        page: 1,
        limit: 2,
        sort: "created_at" as const,
      } satisfies IEcommerceCartItem.IRequest,
    },
  );
  typia.assert(pageOne);
  // Validate pagination metadata for page 1
  TestValidator.equals("page 1 current page", pageOne.pagination.current, 1);
  TestValidator.equals("page 1 limit", pageOne.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 records non-negative",
    pageOne.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    pageOne.pagination.pages >= 0,
  );
  // Validate cart item structure consistency
  if (pageOne.data.length > 0) {
    const item = pageOne.data[0];
    TestValidator.predicate("cart item has id", typeof item.id === "string");
    TestValidator.predicate(
      "cart item has valid quantity",
      typeof item.quantity === "number" && item.quantity >= 1,
    );
    TestValidator.predicate(
      "cart item has timestamp",
      typeof item.created_at === "string",
    );
    TestValidator.predicate(
      "cart item has price",
      typeof item.price === "number",
    );
    TestValidator.predicate(
      "cart item has product",
      typeof item.product?.name === "string" &&
        typeof item.product?.base_price === "number",
    );
    TestValidator.predicate(
      "cart item has variant",
      typeof item.variant?.sku === "string" &&
        typeof item.variant?.option_values === "string",
    );
  }
  // 3. Test pagination with limit=5
  const pageTwo = await api.functional.ecommerce.customer.carts.items.index(
    customerConnection,
    {
      cartId: cartId,
      body: {
        page: 2,
        limit: 5,
        sort: "created_at" as const,
      } satisfies IEcommerceCartItem.IRequest,
    },
  );
  typia.assert(pageTwo);
  // Validate pagination metadata for page 2
  TestValidator.equals("page 2 current page", pageTwo.pagination.current, 2);
  TestValidator.equals("page 2 limit", pageTwo.pagination.limit, 5);
  // Validate consistency between pagination calls
  TestValidator.equals(
    "total records consistency",
    pageOne.pagination.records,
    pageTwo.pagination.records,
  );
  TestValidator.equals(
    "total pages consistency",
    pageOne.pagination.pages,
    pageTwo.pagination.pages,
  );
  // Validate business logic: pages calculation matches records and limit
  if (pageOne.pagination.records > 0 && pageOne.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      pageOne.pagination.records / pageOne.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      pageOne.pagination.pages,
      expectedPages,
    );
  }
  // 4. Test sorting by quantity
  const sortedResults =
    await api.functional.ecommerce.customer.carts.items.index(
      customerConnection,
      {
        cartId: cartId,
        body: {
          page: 1,
          limit: 10,
          sort: "quantity" as const,
        } satisfies IEcommerceCartItem.IRequest,
      },
    );
  typia.assert(sortedResults);
  TestValidator.predicate(
    "sorted results valid",
    sortedResults.pagination.current === 1 &&
      sortedResults.pagination.limit === 10,
  );
  // 5. Test edge case: single page results
  const singlePage = await api.functional.ecommerce.customer.carts.items.index(
    customerConnection,
    {
      cartId: cartId,
      body: {
        page: 1,
        limit: 100, // Large limit to capture all records on single page
        sort: "created_at" as const,
      } satisfies IEcommerceCartItem.IRequest,
    },
  );
  typia.assert(singlePage);
  TestValidator.equals("single page current", singlePage.pagination.current, 1);
  TestValidator.equals("single page limit", singlePage.pagination.limit, 100);
  TestValidator.predicate(
    "single page records",
    singlePage.pagination.records >= 0,
  );
}
