import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test retrieving a paginated, filterable list of wishlist items for a
 * customer's existing wishlist.
 *
 * 1. Register a new customer account and authenticate.
 * 2. Create a new wishlist for the authenticated customer.
 * 3. (Since there is no endpoint to add actual items/SKUs to the wishlist in the
 *    API, we continue with an empty wishlist and validate paginated queries in
 *    this state.)
 * 4. As the authenticated customer, invoke the wishlist items search endpoint with
 *    valid pagination (page/limit), search, and sorting options.
 * 5. Confirm that the response matches expected types, pagination structure, and
 *    privacy is enforced (items are only accessible when authenticated).
 * 6. Check both the success case and that unauthenticated or invalid access
 *    attempts are rejected.
 */
export async function test_api_wishlist_item_search_authenticated_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer account and authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const name = RandomGenerator.name();
  const phone = "010" + RandomGenerator.alphaNumeric(8);
  const joinBody = {
    email,
    password,
    name,
    phone,
  } satisfies IShoppingMallCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);
  TestValidator.equals("created customer email", customer.email, email);
  TestValidator.equals("created customer name", customer.name, name);

  // 2. Create a new wishlist for the authenticated customer
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    { body: {} },
  );
  typia.assert(wishlist);
  TestValidator.equals(
    "wishlist owner is just-registered customer",
    wishlist.customer.id,
    customer.id,
  );

  // 3. Attempt to search wishlist items with default pagination while authenticated - expect empty item list
  const defaultSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    search: undefined,
    sort_by: "created_at",
    order: "desc",
  } satisfies IShoppingMallWishlistItem.IRequest;
  const searchResp =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: defaultSearchBody,
      },
    );
  typia.assert(searchResp);
  TestValidator.equals("pagination: page 1", searchResp.pagination.current, 1);
  TestValidator.equals("pagination: limit", searchResp.pagination.limit, 10);
  TestValidator.equals(
    "empty wishlist returns zero items",
    searchResp.data.length,
    0,
  );

  // 4. Attempt to search items with unauthenticated connection - should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated search request should be rejected",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.index(
        unauthConn,
        {
          wishlistId: wishlist.id,
          body: defaultSearchBody,
        },
      );
    },
  );
}
