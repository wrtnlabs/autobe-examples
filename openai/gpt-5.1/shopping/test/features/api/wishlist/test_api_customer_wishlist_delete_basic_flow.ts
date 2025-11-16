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
 * Validate that an authenticated customer can create and then delete their own
 * wishlist using the customer wishlist APIs.
 *
 * Business context:
 *
 * - A customer joins the platform, may complete email verification, and then uses
 *   wishlists to track products of interest.
 * - The customer should be able to delete their own wishlist using DELETE
 *   /shoppingMall/customer/wishlists/{wishlistId}.
 *
 * What this test covers:
 *
 * 1. Register a new customer via POST /auth/customer/join and obtain an
 *    authenticated IShoppingMallCustomer.IAuthorized envelope. This also
 *    installs the Authorization header in the SDK connection.
 * 2. Call POST /auth/customer/email/verify with a randomly generated
 *    IShoppingMallCustomerAuth.IVerifyEmail payload to exercise the
 *    verification flow and receive another IAuthorized snapshot.
 * 3. Create a wishlist for this authenticated customer using POST
 *    /shoppingMall/customer/wishlists with an IShoppingMallWishlist.ICreate
 *    body containing a human readable name.
 * 4. Delete that wishlist by calling DELETE
 *    /shoppingMall/customer/wishlists/{wishlistId} with the id returned from
 *    step 3.
 * 5. Validate type-level correctness of all responses via typia.assert and use
 *    TestValidator predicates to ensure basic business sanity (wishlist name
 *    echoed back correctly on creation, non-empty id, etc.).
 *
 * Due to the absence of wishlist GET/list APIs in the provided SDK, this test
 * does not re-fetch or list wishlists after deletion; it focuses on the happy
 * path execution of the delete operation itself.
 */
export async function test_api_customer_wishlist_delete_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join)
  const joinBody = {
    ...typia.random<IShoppingMallCustomerAuth.IJoin>(),
    // Ensure network-related context fields are realistic and explicit
    href: "https://shop.example.com/register",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Basic sanity on join: id and email should look valid
  TestValidator.predicate(
    "joined customer has non-empty id",
    (joined.id as string).length > 0,
  );

  // 2. Verify email with a random token (structure-level exercise)
  const verifyBody = typia.random<IShoppingMallCustomerAuth.IVerifyEmail>();

  const verified: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.email.verify.verifyEmail(connection, {
      body: verifyBody,
    });
  typia.assert(verified);

  // 3. Create a wishlist for this customer
  const wishlistName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });

  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: wishlistName,
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(createdWishlist);

  TestValidator.predicate(
    "created wishlist id is non-empty",
    (createdWishlist.id as string).length > 0,
  );
  TestValidator.equals(
    "created wishlist name matches requested name",
    createdWishlist.name,
    wishlistName,
  );

  // 4. Delete the wishlist using its id
  await api.functional.shoppingMall.customer.wishlists.erase(connection, {
    wishlistId: createdWishlist.id,
  });

  // There is no GET or list API available to verify 404 or absence after
  // deletion in the current SDK surface. The successful completion of the
  // erase call without throwing is treated as a successful deletion in this
  // happy-path test.
}
