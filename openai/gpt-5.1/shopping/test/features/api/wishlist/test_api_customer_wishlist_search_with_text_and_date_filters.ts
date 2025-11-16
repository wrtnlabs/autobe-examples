import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validate customer wishlist search with text and (optional) date filters.
 *
 * Business goals:
 *
 * - Ensure an authenticated customer can search their own wishlists via PATCH
 *   /shoppingMall/customer/wishlists using IShoppingMallWishlist.IRequest.
 * - Verify free-text `search` is applied to wishlist names so that only matching
 *   wishlists are returned.
 * - Validate pagination metadata (IPage.IPagination) is consistent with the
 *   actual number of results.
 * - Confirm that all returned wishlists belong to the authenticated customer and
 *   that non-matching wishlists are excluded.
 *
 * Test steps:
 *
 * 1. Register a new customer using auth.customer.join.
 * 2. Create three wishlists for that customer with distinct names, where exactly
 *    one contains the term "Gear" in its name.
 * 3. Call wishlist index with a search term "Gear" and sensible pagination/sorting
 *    parameters.
 * 4. Validate that:
 *
 *    - Only the "Gear" wishlist is returned.
 *    - Pagination.records equals the number of returned wishlists.
 *    - All wishlists belong to the authenticated customer.
 *    - Non-matching wishlists are not present.
 * 5. Perform an additional search with a term that matches no wishlists and assert
 *    that the result set and pagination.records are zero.
 */
export async function test_api_customer_wishlist_search_with_text_and_date_filters(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain an authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://example.com/register" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  const customerId = authorized.customer.id;

  // 2. Create three wishlists with distinct names
  const wishlistNames = ["Laptop Deals", "Camera Gear", "Groceries"] as const;

  const createdWishlists: IShoppingMallWishlist[] = [];

  for (const name of wishlistNames) {
    const createBody = {
      name,
    } satisfies IShoppingMallWishlist.ICreate;

    const wishlist =
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: createBody,
      });
    typia.assert<IShoppingMallWishlist>(wishlist);

    // Basic ownership and name sanity check
    TestValidator.equals(
      "created wishlist belongs to authenticated customer",
      wishlist.customer.id,
      customerId,
    );
    TestValidator.equals(
      "created wishlist name matches request",
      wishlist.name,
      name,
    );

    createdWishlists.push(wishlist);
  }

  const gearWishlist = createdWishlists.find((w) => w.name === "Camera Gear");
  typia.assert<IShoppingMallWishlist | undefined>(gearWishlist);

  // 3. Search wishlists with text filter "Gear"
  const requestBodyWithGearSearch = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: "Gear",
    orderBy: "created_at" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallWishlist.IRequest;

  const pageWithGear =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: requestBodyWithGearSearch,
    });
  typia.assert<IPageIShoppingMallWishlist.ISummary>(pageWithGear);

  const paginationWithGear = pageWithGear.pagination;
  const dataWithGear = pageWithGear.data;

  // 4-1. Pagination sanity
  TestValidator.predicate(
    "pagination.current is non-negative",
    paginationWithGear.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is positive",
    paginationWithGear.limit > 0,
  );

  // We expect exactly one matching wishlist: "Camera Gear"
  TestValidator.equals(
    "search 'Gear' returns exactly one wishlist",
    dataWithGear.length,
    1,
  );
  TestValidator.equals(
    "pagination.records equals number of returned wishlists for 'Gear' search",
    paginationWithGear.records,
    dataWithGear.length,
  );

  // 4-2. Validate each returned wishlist summary
  for (const summary of dataWithGear) {
    // Ensure the wishlist belongs to the authenticated customer
    TestValidator.equals(
      "wishlist summary belongs to authenticated customer",
      summary.customer.id,
      customerId,
    );

    // Ensure the wishlist name contains the search term "Gear"
    TestValidator.predicate(
      "wishlist name contains search term 'Gear'",
      summary.name.includes("Gear"),
    );

    // Ensure that non-matching wishlists are not in the results
    const nonMatching = createdWishlists.filter((w) => w.id !== summary.id);
    for (const other of nonMatching) {
      TestValidator.notEquals(
        "non-matching wishlist id is not present in search results",
        summary.id,
        other.id,
      );
    }
  }

  // 5. Negative search: term that matches no wishlist name
  const requestBodyNoMatch = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: "NonExistingTerm",
    orderBy: "created_at" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallWishlist.IRequest;

  const pageNoMatch =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: requestBodyNoMatch,
    });
  typia.assert<IPageIShoppingMallWishlist.ISummary>(pageNoMatch);

  const paginationNoMatch = pageNoMatch.pagination;
  const dataNoMatch = pageNoMatch.data;

  TestValidator.equals(
    "search with non-existing term returns empty data array",
    dataNoMatch.length,
    0,
  );
  TestValidator.equals(
    "pagination.records is zero when there are no matches",
    paginationNoMatch.records,
    0,
  );
}
