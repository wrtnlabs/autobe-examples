import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Verify that searching items of a newly created wishlist returns an empty page
 * with correct pagination metadata.
 *
 * ## Business context
 *
 * A customer can own multiple wishlists and each wishlist can contain multiple
 * items. When a brand new wishlist is created and no items have been added yet,
 * the items search endpoint should still respond successfully, returning a
 * well-formed paginated response with an empty data array and consistent
 * pagination fields. This test ensures that the wishlist items search endpoint
 * behaves correctly for the initial empty state.
 *
 * ## Scenario steps
 *
 * 1. Register and authenticate a new customer using the join endpoint (POST
 *    /auth/customer/join). This call returns an
 *    IShoppingMallCustomer.IAuthorized structure and also sets the
 *    Authorization header on the connection via the SDK side-effect.
 * 2. Using this authenticated customer connection, create a new wishlist via POST
 *    /shoppingMall/customer/wishlists, providing a small but realistic
 *    IShoppingMallWishlist.ICreate payload (name, optional description,
 *    is_default flag, and status). Capture the returned wishlist id.
 * 3. Without adding any wishlist items, call the wishlist items search endpoint
 *    PATCH /shoppingMall/customer/wishlists/{wishlistId}/items using
 *    api.functional.shoppingMall.customer.wishlists.items.index, passing a body
 *    that satisfies IShoppingMallWishlistItem.IRequest with page=1, limit=10
 *    and leaving all other filters undefined.
 * 4. Validate that the returned object conforms to
 *    IPageIShoppingMallWishlistItem.ISummary using typia.assert.
 * 5. Assert business expectations on the pagination and data fields:
 *
 *    - Pagination.current === 1
 *    - Pagination.limit === 10
 *    - Pagination.records === 0
 *    - Pagination.pages is either 0 or 1 (platform-dependent convention)
 *    - Data is an empty array
 * 6. Ensure no error is thrown during the entire flow, proving that the endpoint
 *    gracefully handles an empty wishlist.
 */
export async function test_api_wishlist_items_search_empty_result_for_new_wishlist(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(customerAuthorized);

  // 2. Create a new wishlist for this customer
  const createWishlistBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createWishlistBody,
    });
  typia.assert(wishlist);

  TestValidator.equals(
    "created wishlist belongs to authenticated customer",
    wishlist.customer.id,
    customerAuthorized.id,
  );

  // 3. Search wishlist items on the new (empty) wishlist
  const searchRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const pageResult: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: searchRequestBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // 4. Validate pagination fields and empty results
  TestValidator.equals(
    "pagination current page should be 1 for new wishlist search",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should reflect requested limit",
    pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records should be zero for empty wishlist",
    pagination.records,
    0,
  );

  // pages may be 0 or 1 when there are no records; allow both
  await TestValidator.predicate(
    "pagination pages should be 0 or 1 when there are no records",
    async () => pagination.pages === 0 || pagination.pages === 1,
  );

  TestValidator.equals(
    "data array should be empty for new wishlist with no items",
    pageResult.data.length,
    0,
  );
}
