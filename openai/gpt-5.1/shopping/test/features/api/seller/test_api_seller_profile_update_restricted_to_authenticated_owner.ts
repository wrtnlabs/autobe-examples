import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Ensure seller profile updates are restricted to authenticated seller
 * sessions.
 *
 * Business purpose
 *
 * - Validate that PUT /shoppingMall/seller/sellers/{sellerId} cannot be used to
 *   modify seller data without a valid seller authentication context.
 * - Protect critical seller profile fields (such as store_name) from anonymous or
 *   improperly authenticated callers.
 *
 * High-level workflow
 *
 * 1. Register a new seller (Seller A) via POST /auth/seller/join to obtain a valid
 *    seller account and sellerId.
 * 2. Optionally issue a seller email verification token via POST
 *    /auth/seller/email/verification/issue to simulate a realistic onboarding
 *    flow (not required for authorization itself, but verifies the dependency
 *    works).
 * 3. Construct an unauthenticated connection by cloning the existing connection
 *    and replacing headers with an empty object, ensuring that no Authorization
 *    header is present.
 * 4. Build a minimal IShoppingMallSeller.IUpdate payload that attempts to change
 *    only the store_name field to a new distinct value.
 * 5. Call api.functional.shoppingMall.seller.sellers.update using the
 *    unauthenticated connection and Seller A's sellerId, and assert that the
 *    call fails using TestValidator.error.
 *
 * Notes
 *
 * - We do not assert on specific HTTP status codes; we only verify that an error
 *   is thrown for the unauthorized update attempt.
 * - We do not perform a read-back verification of the seller profile because a
 *   corresponding GET endpoint is not provided in this scope, and the primary
 *   focus here is authorization enforcement rather than state comparison.
 */
export async function test_api_seller_profile_update_restricted_to_authenticated_owner(
  connection: api.IConnection,
) {
  // 1. Register Seller A and obtain an authorized seller context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerId = sellerAuthorized.id;

  // 2. Optionally issue seller email verification to emulate normal onboarding
  const issueBody = {
    email: sellerAuthorized.email,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  const emailIssue =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      {
        body: issueBody,
      },
    );
  typia.assert<IShoppingMallSellerEmailVerificationIssue.IResponse>(emailIssue);

  // 3. Build an unauthenticated connection by clearing headers
  //    (allowed pattern: clone connection and set headers to {})
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Prepare an update body attempting to change the seller's store_name
  const updateBody = {
    store_name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallSeller.IUpdate;

  // 5. Attempt to update Seller A with an unauthenticated connection and
  //    assert that the operation fails
  await TestValidator.error(
    "unauthenticated seller profile update must be rejected",
    async () => {
      await api.functional.shoppingMall.seller.sellers.update(unauthConn, {
        sellerId,
        body: updateBody,
      });
    },
  );
}
