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
 * Validate customer wishlist creation immediately after email verification.
 *
 * Business goal: Ensure that a brand-new customer who registers and then
 * completes email verification can successfully create their first wishlist
 * using the authenticated customer context.
 *
 * End-to-end flow implemented in this test:
 *
 * 1. Self-register a new customer via /auth/customer/join and obtain an
 *    IShoppingMallCustomer.IAuthorized envelope. The SDK automatically attaches
 *    the issued access token to the connection headers.
 * 2. Call /auth/customer/email/verify with a verification payload so that the
 *    backend marks the customer as email-verified and returns another
 *    IShoppingMallCustomer.IAuthorized instance representing the now-verified
 *    identity.
 * 3. Using the authenticated customer connection, call
 *    /shoppingMall/customer/wishlists with a request body that satisfies
 *    IShoppingMallWishlist.ICreate to create the customer’s first wishlist.
 * 4. Validate that the created wishlist belongs to the same customer, preserves
 *    the requested name, and structurally conforms to IShoppingMallWishlist
 *    including id and timestamp fields.
 *
 * Notes and constraints:
 *
 * - The concrete email verification token value is not observable from the join
 *   response or DTOs. Following the project’s mock tests, the email
 *   verification request body is generated via typia.random so that the
 *   simulator/backend can accept it.
 * - The API list does not include a wishlist listing endpoint, so this test
 *   validates the creation result purely from the single create response
 *   instead of reloading from another read endpoint.
 */
export async function test_api_customer_wishlist_creation_after_email_verification(
  connection: api.IConnection,
) {
  // 1. Register a brand-new customer and obtain an authorized session
  const joinBody = typia.random<IShoppingMallCustomerAuth.IJoin>();

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Verify the customer’s email address using the verification endpoint
  const verifyBody = typia.random<IShoppingMallCustomerAuth.IVerifyEmail>();

  const verified: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.email.verify.verifyEmail(connection, {
      body: verifyBody,
    });
  typia.assert(verified);

  // Optional sanity check: when isVerified flag is provided, it should be true
  if (verified.isVerified !== undefined) {
    TestValidator.predicate(
      "verified customer has isVerified=true when the flag is present",
      verified.isVerified === true,
    );
  }

  // 3. Create the first wishlist for this authenticated customer
  const wishlistName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const createBody = {
    name: wishlistName,
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createBody,
    });
  typia.assert(wishlist);

  // 4. Business validations on the created wishlist

  // 4-1. The wishlist must belong to the same customer as the authorized session
  TestValidator.equals(
    "wishlist.customer.id matches authorized customer id",
    wishlist.customer.id,
    verified.customer.id,
  );

  // 4-2. The wishlist name must equal the requested name
  TestValidator.equals(
    "wishlist name equals requested name",
    wishlist.name,
    wishlistName,
  );

  // 4-3. The wishlist should have a non-empty UUID id string
  TestValidator.predicate(
    "wishlist id is a non-empty string",
    wishlist.id.length > 0,
  );

  // 4-4. createdAt and updatedAt exist and are non-empty; typia.assert already
  //       guarantees date-time format, so here we only check they are present.
  TestValidator.predicate(
    "wishlist createdAt is non-empty",
    wishlist.createdAt.length > 0,
  );
  TestValidator.predicate(
    "wishlist updatedAt is non-empty",
    wishlist.updatedAt.length > 0,
  );
}
