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
 * Validate wishlist pagination across multiple pages for a single customer.
 *
 * ## Business context
 *
 * A shopping mall customer can create multiple wishlists. The search endpoint
 * `PATCH /shoppingMall/customer/wishlists` returns a paginated list of
 * wishlists belonging to the authenticated customer, wrapped in
 * `IPageIShoppingMallWishlist.ISummary`. The request body type
 * `IShoppingMallWishlist.IRequest` supports page/limit and optional filters.
 *
 * This test ensures that when the customer has more wishlists than a single
 * page can contain, the pagination behavior is correct:
 *
 * - First page returns the first `limit` wishlists
 * - Second page returns the remaining wishlists
 * - There is no overlap between pages
 * - Pagination metadata (`records`, `pages`, `current`, `limit`) is consistent
 *   with the requested criteria
 * - All wishlists belong to the same authenticated customer.
 *
 * ## Steps
 *
 * 1. Join a new customer via POST /auth/customer/join using
 *    `IShoppingMallCustomerAuth.IJoin`. The SDK function is
 *    `api.functional.auth.customer.join`. This sets the Authorization header on
 *    the shared `connection`, so subsequent wishlist calls are performed as
 *    this customer.
 * 2. Create 15 distinct wishlists using
 *    `api.functional.shoppingMall.customer.wishlists.create` with
 *    `IShoppingMallWishlist.ICreate` as the body. Use deterministic names like
 *    "Wishlist 01" .. "Wishlist 15" to make reasoning easier, but the test does
 *    not rely on any particular order.
 * 3. Call `api.functional.shoppingMall.customer.wishlists.index` with `body: {
 *    page: 1, limit: 10 } satisfies IShoppingMallWishlist.IRequest` to request
 *    the first page. Assert:
 *
 *    - Response type with `typia.assert<IPageIShoppingMallWishlist.ISummary>`
 *    - `pagination.limit === 10`
 *    - `pagination.records >= 15`
 *    - `pagination.pages >= 2`
 *    - `pagination.current` matches the backend's convention. The docs say
 *         `IPage.IPagination.current` is zero-based, but the request `page` is
 *         one-based. We therefore only assert that `pagination.current` is
 *         either 0 or 1 and that it is less than `pagination.pages`.
 *    - `data.length === 10` (when there are at least 10 records).
 * 4. Collect the wishlist IDs from page 1 into a `Set<string>` for later
 *    comparison.
 * 5. Call the same index endpoint again with `body: { page: 2, limit: 10 }
 *    satisfies IShoppingMallWishlist.IRequest` to request the second page.
 *    Assert:
 *
 *    - Response type via `typia.assert`.
 *    - `data.length >= 1` and `data.length <= 10` (there should be at least 5
 *         remaining wishlists because we created 15 in total, but we only
 *         assert `>= 1` to avoid coupling to strict record counting in case the
 *         backend has different default filters).
 *    - None of the IDs on page 2 exist in the first page ID set.
 *    - Every wishlist summary's `customer.id` equals the authorized customer id from
 *         the join response (validate with TestValidator).
 * 6. Optionally, perform an extra sanity check that re-calling page 1 returns the
 *    same set size (10) and still only wishlists belonging to the same
 *    customer.
 */
export async function test_api_customer_wishlist_search_pagination_across_multiple_pages(
  connection: api.IConnection,
) {
  // 1. Join a new customer and establish authenticated context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    // ip is optional and can be omitted, href/referrer must be valid URIs
    href: "https://shop.example.com/register",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  const customerId = authorizedCustomer.id;

  // 2. Create 15 distinct wishlists for this customer
  const wishlistCount = 15;
  const createdWishlistIds: string[] = [];

  for (let i = 1; i <= wishlistCount; i += 1) {
    const indexLabel = i.toString().padStart(2, "0");
    const createBody = {
      name: `Wishlist ${indexLabel}`,
    } satisfies IShoppingMallWishlist.ICreate;

    const wishlist: IShoppingMallWishlist =
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: createBody,
      });
    typia.assert<IShoppingMallWishlist>(wishlist);

    createdWishlistIds.push(wishlist.id);

    // Ensure wishlist belongs to the authenticated customer
    TestValidator.equals(
      `wishlist ${indexLabel} belongs to joined customer`,
      wishlist.customer.id,
      customerId,
    );
  }

  TestValidator.equals(
    "created wishlist count matches expectation",
    createdWishlistIds.length,
    wishlistCount,
  );

  // 3. Request first page with limit 10
  const pageLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const firstPageRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageLimit,
  } satisfies IShoppingMallWishlist.IRequest;

  const firstPage:
    | IPageIShoppingMallWishlist.ISummary
    | (IPageIShoppingMallWishlist.ISummary & {
        pagination: IPage.IPagination;
      }) = await api.functional.shoppingMall.customer.wishlists.index(
    connection,
    {
      body: firstPageRequestBody,
    },
  );
  typia.assert<IPageIShoppingMallWishlist.ISummary>(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  // Basic pagination metadata validations
  TestValidator.equals(
    "first page limit equals requested limit",
    firstPagination.limit,
    pageLimit,
  );

  TestValidator.predicate(
    "total records should be at least number of created wishlists",
    firstPagination.records >= wishlistCount,
  );

  TestValidator.predicate(
    "there should be at least 2 pages when more than one page of wishlists exist",
    firstPagination.pages >= 2,
  );

  TestValidator.predicate(
    "current page index should be non-negative and less than pages",
    firstPagination.current >= 0 &&
      firstPagination.current < firstPagination.pages,
  );

  // When there are at least `pageLimit` records, first page should be full
  TestValidator.equals(
    "first page item count should equal limit when records exceed limit",
    firstData.length,
    pageLimit,
  );

  // All wishlists in first page must belong to the authenticated customer
  for (const summary of firstData) {
    TestValidator.equals(
      "first page wishlist belongs to authenticated customer",
      summary.customer.id,
      customerId,
    );
  }

  const firstPageIds = new Set<string>(firstData.map((w) => w.id));

  // 5. Request second page with same limit
  const secondPageRequestBody = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageLimit,
  } satisfies IShoppingMallWishlist.IRequest;

  const secondPage:
    | IPageIShoppingMallWishlist.ISummary
    | (IPageIShoppingMallWishlist.ISummary & {
        pagination: IPage.IPagination;
      }) = await api.functional.shoppingMall.customer.wishlists.index(
    connection,
    {
      body: secondPageRequestBody,
    },
  );
  typia.assert<IPageIShoppingMallWishlist.ISummary>(secondPage);

  const secondPagination = secondPage.pagination;
  const secondData = secondPage.data;

  TestValidator.equals(
    "second page limit equals requested limit",
    secondPagination.limit,
    pageLimit,
  );

  TestValidator.predicate(
    "second page index should be non-negative and less than pages",
    secondPagination.current >= 0 &&
      secondPagination.current < secondPagination.pages,
  );

  TestValidator.predicate(
    "second page should contain at least one wishlist when total records exceed first page",
    secondData.length >= 1,
  );

  TestValidator.predicate(
    "second page should not exceed requested page size",
    secondData.length <= pageLimit,
  );

  // All wishlists in second page must belong to the authenticated customer and
  // must not overlap with first page IDs
  for (const summary of secondData) {
    TestValidator.equals(
      "second page wishlist belongs to authenticated customer",
      summary.customer.id,
      customerId,
    );

    TestValidator.predicate(
      "wishlist IDs on second page do not overlap with first page",
      firstPageIds.has(summary.id) === false,
    );
  }

  // Optional extra sanity: requesting first page again should still return limit
  const firstPageAgain =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: firstPageRequestBody,
    });
  typia.assert<IPageIShoppingMallWishlist.ISummary>(firstPageAgain);

  TestValidator.equals(
    "reloaded first page item count should still equal limit",
    firstPageAgain.data.length,
    pageLimit,
  );

  for (const summary of firstPageAgain.data) {
    TestValidator.equals(
      "reloaded first page wishlist belongs to authenticated customer",
      summary.customer.id,
      customerId,
    );
  }
}
