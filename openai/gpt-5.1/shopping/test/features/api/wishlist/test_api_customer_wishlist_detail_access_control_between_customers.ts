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
 * Verify wishlist detail access control between different customers.
 *
 * Business goal: Ensure that a customer can only retrieve their own wishlist
 * details via GET /shoppingMall/customer/wishlists/{wishlistId}, and that even
 * with a valid wishlist UUID belonging to another customer, access is denied.
 *
 * Steps:
 *
 * 1. Register Customer A via POST /auth/customer/join (auto-authenticates A).
 * 2. Under A's token, create wishlist A via POST /shoppingMall/customer/wishlists.
 * 3. Register Customer B via POST /auth/customer/join (connection now
 *    authenticated as B).
 * 4. As B, attempt to access wishlist A using GET
 *    /shoppingMall/customer/wishlists/{wishlistId}.
 *
 *    - Expect an error (authorization/ownership violation) and validate with
 *         TestValidator.error, without checking specific HTTP status codes.
 * 5. Positive controls: A and B can each access their own wishlist via GET
 *    /shoppingMall/customer/wishlists/{wishlistId}.
 */
export async function test_api_customer_wishlist_detail_access_control_between_customers(
  connection: api.IConnection,
) {
  // 1. Register Customer A (join + implicit authentication)
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBodyA,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerA);

  // 2. Customer A creates a wishlist
  const createWishlistBodyA = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createWishlistBodyA,
    });
  typia.assert<IShoppingMallWishlist>(wishlistA);

  // Owner check for wishlist A
  TestValidator.equals(
    "wishlist A belongs to customer A",
    wishlistA.customer.id,
    customerA.id,
  );

  // Positive control: A can access their own wishlist detail
  const wishlistAReadByA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      wishlistId: wishlistA.id,
    });
  typia.assert<IShoppingMallWishlist>(wishlistAReadByA);
  TestValidator.equals(
    "customer A can read own wishlist",
    wishlistAReadByA.id,
    wishlistA.id,
  );

  // 3. Register Customer B (re-authenticates connection as B)
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBodyB,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerB);

  // 3-1. Customer B creates their own wishlist (for positive control)
  const createWishlistBodyB = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistB: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createWishlistBodyB,
    });
  typia.assert<IShoppingMallWishlist>(wishlistB);

  TestValidator.equals(
    "wishlist B belongs to customer B",
    wishlistB.customer.id,
    customerB.id,
  );

  // Positive control: B can access their own wishlist
  const wishlistBReadByB: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      wishlistId: wishlistB.id,
    });
  typia.assert<IShoppingMallWishlist>(wishlistBReadByB);
  TestValidator.equals(
    "customer B can read own wishlist",
    wishlistBReadByB.id,
    wishlistB.id,
  );

  // 4. As B, attempt to read A's wishlist and expect failure
  await TestValidator.error(
    "customer B cannot access customer A's wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.at(connection, {
        wishlistId: wishlistA.id,
      });
    },
  );
}
