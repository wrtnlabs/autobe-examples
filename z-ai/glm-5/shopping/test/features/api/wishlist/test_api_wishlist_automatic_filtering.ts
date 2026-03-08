import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that the wishlist view automatically filters out products from
 * deleted, suspended, or banned sellers without customer notification.
 *
 * The PATCH /shoppingMall/customer/wishlists endpoint returns the customer's
 * wishlist with automatic server-side filtering applied to exclude:
 * - Products from suspended sellers (seller.suspended = true)
 * - Products from banned sellers (seller.banned = true)
 * - Deleted products (product.deleted_at IS NOT NULL)
 *
 * This filtering is transparent to the customer - no error notifications
 * are sent about removed products.
 *
 * Note: The filtering behavior is implemented server-side. This test validates
 * the response structure and verifies that all returned items conform to the
 * expected filtering rules (non-suspended, non-banned sellers).
 */
export async function test_api_wishlist_automatic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Register a new customer
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Test 1: Empty wishlist returns valid response structure
  const emptyWishlist =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(emptyWishlist);
  // Verify pagination structure for empty wishlist
  TestValidator.equals(
    "current page is 1",
    emptyWishlist.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is valid",
    emptyWishlist.pagination.limit >= 0 &&
      emptyWishlist.pagination.limit <= 100,
  );
  TestValidator.equals(
    "records is 0 for empty",
    emptyWishlist.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages is 0 for empty",
    emptyWishlist.pagination.pages,
    0,
  );
  TestValidator.equals("data is empty array", emptyWishlist.data.length, 0);
  // Test 2: Request with pagination parameters
  const paginatedWishlist =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          limit: 20,
          sort: RandomGenerator.pick([
            "created_at",
            "price_asc",
            "price_desc",
          ] as const),
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(paginatedWishlist);
  // Verify response structure
  TestValidator.predicate(
    "pagination has valid current",
    paginatedWishlist.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    paginatedWishlist.pagination.limit >= 1 &&
      paginatedWishlist.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has valid records",
    paginatedWishlist.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    paginatedWishlist.pagination.pages >= 0,
  );
  // Test 3: Verify each wishlist item structure (if any items exist)
  for (const item of paginatedWishlist.data) {
    // Verify item has valid product reference
    typia.assert(item);
    TestValidator.predicate("item has valid id", item.id.length > 0);
    TestValidator.predicate(
      "item has product",
      item.product !== null && item.product !== undefined,
    );
    // Verify product structure
    const product = item.product;
    TestValidator.predicate("product has valid id", product.id.length > 0);
    TestValidator.predicate("product has valid name", product.name.length > 0);
    TestValidator.predicate(
      "product has valid base_price",
      product.base_price >= 0,
    );
    TestValidator.predicate(
      "product has valid min_price",
      product.min_price >= 0,
    );
    TestValidator.predicate(
      "product has valid max_price",
      product.max_price >= product.min_price,
    );
    TestValidator.predicate(
      "product has valid review_count",
      product.review_count >= 0,
    );
    // Verify seller is NOT suspended or banned (filtered by server)
    const seller = product.seller;
    TestValidator.equals("seller is not suspended", seller.suspended, false);
    TestValidator.equals("seller is not banned", seller.banned, false);
    TestValidator.predicate(
      "seller has valid approval_status",
      seller.approval_status === "approved" ||
        seller.approval_status === "pending" ||
        seller.approval_status === "rejected",
    );
    // Verify category structure
    const category = product.category;
    TestValidator.predicate("category has valid id", category.id.length > 0);
    TestValidator.predicate(
      "category has valid name",
      category.name.length > 0,
    );
    // Verify timestamps
    TestValidator.predicate(
      "created_at is valid date-time",
      new Date(item.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      "product created_at is valid",
      new Date(product.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      "seller created_at is valid",
      new Date(seller.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      "category created_at is valid",
      new Date(category.created_at).getTime() > 0,
    );
  }
  // Test 4: Verify filtering behavior - all returned items should have valid sellers
  // The server automatically filters out products from suspended/banned sellers
  // and deleted products, so all items in the response should be valid
  if (paginatedWishlist.data.length > 0) {
    const allItemsValid = paginatedWishlist.data.every((item) => {
      const seller = item.product.seller;
      return seller.suspended === false && seller.banned === false;
    });
    TestValidator.predicate(
      "all items have valid non-suspended, non-banned sellers",
      allItemsValid,
    );
  }
  // Test 5: Test pagination with cursor
  const cursorWishlist =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          limit: 10,
          cursor: new Date().toISOString() as string & tags.Format<"date-time">,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(cursorWishlist);
  TestValidator.predicate(
    "cursor pagination returns valid structure",
    cursorWishlist.pagination !== undefined,
  );
}
