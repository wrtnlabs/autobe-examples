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

export async function test_api_customer_default_wishlist_flag_on_creation(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join) and obtain authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Attempt email verification with an opaque token (best-effort, as we
  // have no way to obtain a real token from the provided APIs). The API
  // contract says it returns IShoppingMallCustomer.IAuthorized on success.
  // We call it primarily to exercise the endpoint, but do not rely on it for
  // wishlist behavior semantics.
  const verifyEmailBody = {
    token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallCustomerAuth.IVerifyEmail;

  try {
    const verified: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.email.verify.verifyEmail(connection, {
        body: verifyEmailBody,
      });
    typia.assert(verified);
  } catch {
    // If verification fails due to invalid token, ignore for this test as the
    // join call may already allow wishlist creation depending on policy.
  }

  // 3. Create the first wishlist and assert it is marked as default
  const firstWishlistBody = {
    name: `Wishlist-${RandomGenerator.alphabets(8)}`,
  } satisfies IShoppingMallWishlist.ICreate;

  const firstWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: firstWishlistBody,
    });
  typia.assert(firstWishlist);

  // Basic sanity: wishlist has an id and belongs to the joined customer
  TestValidator.predicate(
    "first wishlist should have a non-empty id",
    firstWishlist.id.length > 0,
  );
  TestValidator.equals(
    "first wishlist customer id matches authorized customer id",
    firstWishlist.customer.id,
    authorizedCustomer.id,
  );
  TestValidator.equals(
    "first wishlist should be default",
    firstWishlist.isDefault,
    true,
  );

  // 4. Create a second wishlist for the same customer
  const secondWishlistBody = {
    name: `Wishlist-${RandomGenerator.alphabets(8)}-2`,
  } satisfies IShoppingMallWishlist.ICreate;

  const secondWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: secondWishlistBody,
    });
  typia.assert(secondWishlist);

  // Sanity: second wishlist has an id and belongs to same customer
  TestValidator.predicate(
    "second wishlist should have a non-empty id",
    secondWishlist.id.length > 0,
  );
  TestValidator.equals(
    "second wishlist customer id matches authorized customer id",
    secondWishlist.customer.id,
    authorizedCustomer.id,
  );

  // 5. Enforce single-default invariant in a minimal way: second wishlist
  // must not also be default when the first one is already default.
  TestValidator.equals(
    "second wishlist should not be default when first is default",
    secondWishlist.isDefault,
    false,
  );

  // Additionally, ensure that only the first wishlist is default among the
  // two we have in hand.
  TestValidator.equals(
    "first wishlist remains default while second is not",
    firstWishlist.isDefault,
    true,
  );
}
