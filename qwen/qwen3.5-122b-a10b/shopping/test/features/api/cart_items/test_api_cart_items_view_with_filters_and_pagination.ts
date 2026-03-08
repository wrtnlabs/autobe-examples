import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer cart items view with filters and pagination.
 * 1. Customer joins and authenticates
 * 2. View cart with various filter combinations
 * 3. Test pagination (traditional and cursor-based)
 * 4. Verify response structure and data integrity
 */
export async function test_api_cart_items_view_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Customer joins and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. View cart without filters - verify response structure
  const cartWithoutFilters =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartWithoutFilters);
  TestValidator.predicate(
    "pagination metadata exists",
    cartWithoutFilters.pagination !== null,
  );
  TestValidator.predicate(
    "data is array",
    Array.isArray(cartWithoutFilters.data),
  );
  // 3. Test search filter by product name
  const searchFilter = "test";
  const cartWithSearch =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          search: searchFilter,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartWithSearch);
  // 4. Test availability filter (is_available=true)
  const cartAvailable =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: { is_available: true } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartAvailable);
  // Verify all returned items are available
  for (const item of cartAvailable.data) {
    TestValidator.equals("item is available", item.is_available, true);
  }
  // 5. Test availability filter (is_available=false)
  const cartUnavailable =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: { is_available: false } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartUnavailable);
  // Verify all returned items are unavailable
  for (const item of cartUnavailable.data) {
    TestValidator.equals("item is unavailable", item.is_available, false);
  }
  // 6. Test date range filter
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const cartWithDateRange =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          added_at_from: oneHourAgo.toISOString(),
          added_at_to: oneDayFromNow.toISOString(),
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartWithDateRange);
  // 7. Test sorting by quantity
  const cartSortedByQuantity =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          sort: "quantity:desc",
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartSortedByQuantity);
  // 8. Test sorting by price
  const cartSortedByPrice =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: { sort: "price:asc" } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartSortedByPrice);
  // 9. Test traditional pagination
  const page = 1;
  const limit = 10;
  const cartWithPagination =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: { page, limit } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartWithPagination);
  TestValidator.equals(
    "pagination current page",
    cartWithPagination.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit",
    cartWithPagination.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    cartWithPagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    cartWithPagination.pagination.pages >= 0,
  );
  // 10. Test cursor-based pagination
  const cartWithCursor =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          cursor_added_at: now.toISOString(),
          cursor_id: typia.random<string & tags.Format<"uuid">>(),
          limit: 5,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartWithCursor);
  // 11. Verify cart item structure when data exists
  if (cartWithoutFilters.data.length > 0) {
    const firstItem = cartWithoutFilters.data[0];
    // Verify required fields
    TestValidator.predicate(
      "quantity is positive integer",
      firstItem.quantity >= 1,
    );
    TestValidator.predicate(
      "is_available is boolean",
      typeof firstItem.is_available === "boolean",
    );
    // Verify product_variant structure
    const variant = firstItem.product_variant;
    TestValidator.predicate(
      "variant has sku_code",
      typeof variant.sku_code === "string" && variant.sku_code.length > 0,
    );
    TestValidator.predicate(
      "variant has stock_quantity",
      typeof variant.stock_quantity === "number",
    );
    TestValidator.predicate(
      "variant has option_values",
      typeof variant.option_values === "object",
    );
    // Verify subtotal
    TestValidator.predicate(
      "subtotal is non-negative",
      firstItem.subtotal >= 0,
    );
  }
}
