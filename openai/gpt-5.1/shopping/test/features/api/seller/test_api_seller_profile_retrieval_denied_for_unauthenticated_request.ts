import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify that seller profiles are not accessible without seller authentication.
 *
 * Business goal:
 *
 * - Ensure that the seller-facing profile endpoint GET
 *   /shoppingMall/seller/sellers/{sellerId}/profile enforces authentication and
 *   does not expose profile data to unauthenticated callers, while still
 *   working correctly for an authenticated seller.
 *
 * Scenario steps:
 *
 * 1. Join as a new seller via POST /auth/seller/join, capturing the
 *    IShoppingMallSeller.IAuthorized response (including id and token).
 * 2. Update the seller profile via PUT
 *    /shoppingMall/seller/sellers/{sellerId}/profile so that there is
 *    meaningful profile data (store_name, support channels).
 * 3. Build an unauthenticated connection by shallow-cloning the provided
 *    connection into a new api.IConnection whose headers are an empty object.
 *    This new connection must not have any Authorization header because the SDK
 *    automatically manages tokens on the main connection.
 * 4. Using this unauthenticated connection, call
 *    api.functional.shoppingMall.seller.sellers.profile.at with the sellerId
 *    and verify via TestValidator.error that the call fails (throws), without
 *    asserting a concrete HTTP status code, since E2E tests must not lock onto
 *    numeric status codes.
 * 5. As a control, call the same endpoint using the original authenticated
 *    connection and assert that a valid IShoppingMallSellerProfile is returned,
 *    and that its key fields (e.g., store_name) match the values set in step
 *    2.
 */
export async function test_api_seller_profile_retrieval_denied_for_unauthenticated_request(
  connection: api.IConnection,
) {
  // 1. Seller joins and obtains an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedSeller);

  const sellerId = authorizedSeller.id;

  // 2. Ensure there is a concrete seller profile by updating it
  const profileUpdateBody = {
    store_name: RandomGenerator.name(2),
    store_description: RandomGenerator.paragraph({ sentences: 5 }),
    support_email: typia.random<string & tags.Format<"email">>(),
    support_phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerProfile.IUpdate;

  const updatedProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellers.profile.update(
      connection,
      {
        sellerId,
        body: profileUpdateBody,
      },
    );
  typia.assert(updatedProfile);

  // Sanity check: updated profile should reflect our changes
  TestValidator.equals(
    "updated profile store_name should match input",
    updatedProfile.store_name,
    profileUpdateBody.store_name,
  );

  // 3. Build an unauthenticated connection by cloning without headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Unauthenticated access must fail
  await TestValidator.error(
    "unauthenticated seller profile access should fail",
    async () => {
      await api.functional.shoppingMall.seller.sellers.profile.at(
        unauthenticatedConnection,
        {
          sellerId,
        },
      );
    },
  );

  // 5. Authenticated access using the original connection must succeed
  const authedProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellers.profile.at(connection, {
      sellerId,
    });
  typia.assert(authedProfile);

  // Validate that authenticated fetch returns the same profile that we updated
  TestValidator.equals(
    "authenticated profile store_name should match updated value",
    authedProfile.store_name,
    profileUpdateBody.store_name,
  );
  TestValidator.equals(
    "authenticated profile support_email should match updated value",
    authedProfile.support_email,
    profileUpdateBody.support_email,
  );
  TestValidator.equals(
    "authenticated profile support_phone should match updated value",
    authedProfile.support_phone,
    profileUpdateBody.support_phone,
  );
}
