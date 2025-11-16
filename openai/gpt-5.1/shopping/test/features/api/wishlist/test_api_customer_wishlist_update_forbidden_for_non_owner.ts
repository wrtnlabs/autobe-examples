import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validate that a customer cannot update a wishlist they do not own, while the
 * rightful owner can.
 *
 * Business goal:
 *
 * - Enforce ownership-based access control for wishlist updates.
 *
 * Scenario steps:
 *
 * 1. Customer A joins the shopping mall, which also authenticates them and sets
 *    the Authorization header in the connection.
 * 2. With Customer A’s authenticated context, create a wishlist and capture its id
 *    and original name.
 * 3. Customer B joins the shopping mall, which updates the connection
 *    Authorization to Customer B’s access token.
 * 4. Using Customer B’s authenticated context, attempt to update Customer A’s
 *    wishlist with a valid IShoppingMallWishlist.IUpdate payload (changing the
 *    name).
 *
 *    - Expect an error because Customer B does not own the wishlist.
 * 5. Re-authenticate as Customer A by calling join again with Customer A’s
 *    credentials, restoring Customer A’s Authorization token on the same
 *    connection.
 * 6. As Customer A, perform a legitimate update on the same wishlist, changing its
 *    name to another valid value.
 * 7. Assert that the owner’s update succeeds and the returned wishlist reflects
 *    the new name and same id.
 */
export async function test_api_customer_wishlist_update_forbidden_for_non_owner(
  connection: api.IConnection,
) {
  // 1. Customer A joins (registers) and becomes authenticated
  const customerAJoinBody = {
    email: `customerA+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "password-A",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAAuth);

  // 2. Customer A creates a wishlist
  const initialWishlistBody = {
    name: `Wishlist-A-${RandomGenerator.alphabets(6)}`,
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistOfA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: initialWishlistBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlistOfA);

  // 3. Customer B joins and overwrites Authorization on the same connection
  const customerBJoinBody = {
    email: `customerB+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "password-B",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerBAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBAuth);

  // 4. As Customer B, attempt to update Customer A’s wishlist and expect failure
  const forbiddenUpdateBody = {
    name: `Wishlist-A-By-B-${RandomGenerator.alphabets(6)}`,
  } satisfies IShoppingMallWishlist.IUpdate;

  await TestValidator.error(
    "non-owner cannot update another customer's wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.update(connection, {
        wishlistId: wishlistOfA.id,
        body: forbiddenUpdateBody,
      });
    },
  );

  // 5. Re-authenticate as Customer A using join again (this resets Authorization)
  const customerAReAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAReAuth);

  // 6. As Customer A (owner), perform a valid update on the wishlist
  const ownerUpdateBody = {
    name: `Wishlist-A-Owner-${RandomGenerator.alphabets(6)}`,
  } satisfies IShoppingMallWishlist.IUpdate;

  const updatedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: wishlistOfA.id,
      body: ownerUpdateBody,
    });
  typia.assert<IShoppingMallWishlist>(updatedWishlist);

  // 7. Validate that the wishlist id is unchanged and name reflects owner update
  TestValidator.equals(
    "wishlist id remains unchanged after owner update",
    updatedWishlist.id,
    wishlistOfA.id,
  );

  TestValidator.equals(
    "wishlist name reflects latest owner update",
    updatedWishlist.name,
    ownerUpdateBody.name,
  );
}
