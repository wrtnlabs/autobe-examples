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
 * Ensure that a customer cannot delete another customer's wishlist.
 *
 * Business purpose
 *
 * - Wishlist resources in shopping_mall_wishlists must be strictly owned by a
 *   single customer.
 * - DELETE /shoppingMall/customer/wishlists/{wishlistId} must enforce ownership
 *   based on the authenticated customer, rejecting attempts from other
 *   customers.
 *
 * High-level workflow implemented by this test
 *
 * 1. Register Customer A via POST /auth/customer/join and obtain an authenticated
 *    customer session (SDK updates connection headers automatically).
 * 2. (Scenario mentions email verification, but the verification token API surface
 *    does not let us create a valid token here; therefore we skip explicit
 *    verifyEmail calls and rely on the join response to provide a usable
 *    authenticated context.)
 * 3. Using Customer A's authenticated connection, call POST
 *    /shoppingMall/customer/wishlists to create a wishlist and capture its id.
 * 4. Register Customer B via POST /auth/customer/join. The SDK automatically
 *    overwrites the Authorization header so that the connection is now
 *    authenticated as Customer B.
 * 5. Using Customer B's authentication context, attempt to delete Customer A's
 *    wishlist by calling DELETE /shoppingMall/customer/wishlists/{wishlistId}
 *    with the wishlist id created in step 3.
 * 6. Assert that the delete attempt results in an HTTP error (authorization
 *    failure) using TestValidator.error.
 *
 * Notes / deviations from the natural-language plan
 *
 * - The original scenario requested verifying that the wishlist still exists and
 *   is retrievable by Customer A via a GET endpoint, but no such GET API is
 *   provided in the SDK list, and we must not invent non-existent functions.
 *   Therefore, this test only covers the negative delete attempt from Customer
 *   B and does not perform a follow-up read check.
 * - We also do not call the email verification API because there is no way to
 *   obtain a valid verification token value from the join response or any other
 *   provided API; any token we fabricate would be invalid and cause
 *   business-level errors unrelated to wishlist authorization.
 */
export async function test_api_customer_wishlist_delete_protects_other_customers_data(
  connection: api.IConnection,
) {
  // 1. Register Customer A and obtain an authenticated session.
  const customerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerA);

  // 2. Create a wishlist as Customer A.
  const wishlistCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlist);

  // Sanity check: wishlist.customer.id should match Customer A's id.
  TestValidator.equals(
    "wishlist owner must be Customer A",
    wishlist.customer.id,
    customerA.id,
  );

  // 3. Register Customer B; this call will update the Authorization
  //    header on the shared connection so that subsequent calls are
  //    executed in B's context.
  const customerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/campaign",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerB);

  TestValidator.notEquals(
    "Customer B must be a different account from Customer A",
    customerB.id,
    customerA.id,
  );

  // 4. Attempt to delete Customer A's wishlist while authenticated as
  //    Customer B. This must fail with an authorization error. We do
  //    not assert on specific HTTP status codes, only that an error is
  //    thrown.
  await TestValidator.error(
    "cross-account wishlist delete must fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.erase(connection, {
        wishlistId: wishlist.id,
      });
    },
  );
}
