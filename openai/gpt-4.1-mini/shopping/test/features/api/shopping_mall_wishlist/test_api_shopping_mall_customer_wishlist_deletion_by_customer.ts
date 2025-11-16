import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_shopping_mall_customer_wishlist_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration via /auth/customer/join
  const createCustomerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: createCustomerBody,
    });
  typia.assert(customer);

  // 2. Create a wishlist for this customer
  const createWishlistBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 7 }),
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createWishlistBody,
    });
  typia.assert(wishlist);

  // 3. Delete the wishlist permanently via DELETE endpoint
  await api.functional.shoppingMall.customer.wishlists.erase(connection, {
    wishlistId: wishlist.id,
  });

  // 4. Validate that accessing the wishlist is no longer possible (should error)
  await TestValidator.error("access deleted wishlist should fail", async () => {
    await api.functional.shoppingMall.customer.wishlists.erase(connection, {
      wishlistId: wishlist.id,
    });
  });
}
