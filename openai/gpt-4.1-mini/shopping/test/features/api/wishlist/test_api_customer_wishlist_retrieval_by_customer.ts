import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_customer_wishlist_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication via POST /auth/customer/join
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Create a wishlist for the customer with POST /shoppingMall/customer/wishlists
  const wishlistCreateBody = {
    name: "My Favorite Products",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlist);

  // 3. Retrieve the wishlist by its id GET /shoppingMall/customer/wishlists/{wishlistId}
  const fetchedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      wishlistId: wishlist.id,
    });
  typia.assert(fetchedWishlist);

  // 4. Validate the fetched wishlist against the created wishlist
  TestValidator.equals(
    "wishlist ID should match",
    fetchedWishlist.id,
    wishlist.id,
  );
  TestValidator.equals(
    "wishlist customer ID should match",
    fetchedWishlist.customer_id,
    customer.id,
  );
  TestValidator.equals(
    "wishlist name should match",
    fetchedWishlist.name,
    wishlistCreateBody.name,
  );
  TestValidator.equals(
    "wishlist status should be active",
    fetchedWishlist.status,
    "active",
  );

  // 5. Validate timestamps exist and are valid ISO strings
  TestValidator.predicate(
    "wishlist created_at should be valid ISO string",
    typeof fetchedWishlist.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        fetchedWishlist.created_at,
      ),
  );
  TestValidator.predicate(
    "wishlist updated_at should be valid ISO string",
    typeof fetchedWishlist.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        fetchedWishlist.updated_at,
      ),
  );
  // deleted_at can be null or undefined since it's optional
  TestValidator.predicate(
    "wishlist deleted_at should be null or iso string",
    fetchedWishlist.deleted_at === null ||
      fetchedWishlist.deleted_at === undefined ||
      (typeof fetchedWishlist.deleted_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
          fetchedWishlist.deleted_at,
        )),
  );
}
