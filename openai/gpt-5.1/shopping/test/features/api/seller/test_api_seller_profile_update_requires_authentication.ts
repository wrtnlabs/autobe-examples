import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify that seller profile updates require authentication and cannot be
 * performed with an unauthenticated connection.
 *
 * Business intent
 *
 * - Seller profile (IShoppingMallSellerProfile) is a protected resource and
 *   should only be modifiable by authenticated actors (seller or possibly
 *   admin).
 * - The endpoint PUT /shoppingMall/seller/sellers/{sellerId}/profile must reject
 *   requests that do not carry a valid Authorization header.
 *
 * Test flow
 *
 * 1. Register a new seller using POST /auth/seller/join.
 *
 *    - Use typia.random<IShoppingMallSellerAuthJoin.IRequest>() to generate a valid
 *         join payload.
 *    - Capture the returned seller id from IShoppingMallSeller.IAuthorized.id.
 * 2. Create an unauthenticated connection object based on the provided connection.
 *
 *    - Do NOT modify `connection.headers` directly; instead construct a fresh
 *         api.IConnection with the same host and options but with headers: {}.
 *    - This simulates a client that has never logged in.
 * 3. Prepare a syntactically valid profile update payload using
 *    IShoppingMallSellerProfile.IUpdate.
 *
 *    - For example, set store_name, store_description, support_email, support_phone.
 * 4. Using the unauthenticated connection, attempt to call
 *    api.functional.shoppingMall.seller.sellers.profile.update with:
 *
 *    - SellerId: the id from step 1
 *    - Body: the update payload from step 3 This should fail due to missing
 *         authentication.
 * 5. Wrap the unauthenticated update call with TestValidator.error to assert that
 *    some error is thrown (without asserting specific HTTP status code).
 * 6. For additional safety, perform a positive control using the authenticated
 *    seller connection:
 *
 *    - Call api.functional.shoppingMall.seller.sellers.profile.update again using
 *         the original `connection` (which is authenticated by join()) with a
 *         different payload.
 *    - Assert that the call succeeds and returns an IShoppingMallSellerProfile,
 *         validating it with typia.assert.
 *    - Use TestValidator.equals to confirm that store_name was updated to the
 *         expected value.
 */
export async function test_api_seller_profile_update_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new seller and obtain an authenticated connection and seller id
  const sellerJoinRequest =
    typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinRequest,
    });
  typia.assert(sellerAuthorized);

  const sellerId = sellerAuthorized.id;

  // 2. Build an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
    headers: {},
  };

  // 3. Prepare a valid profile update payload
  const unauthUpdateBody = {
    store_name: RandomGenerator.paragraph({ sentences: 2 }),
    store_description: RandomGenerator.paragraph({ sentences: 4 }),
    support_email: typia.random<string & tags.Format<"email">>(),
    support_phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerProfile.IUpdate;

  // 4-5. Attempt unauthorized update and expect an error (authentication required)
  await TestValidator.error(
    "seller profile update should fail without authentication",
    async () => {
      await api.functional.shoppingMall.seller.sellers.profile.update(
        unauthenticatedConnection,
        {
          sellerId,
          body: unauthUpdateBody,
        },
      );
    },
  );

  // 6. Positive control: authenticated seller can update profile successfully
  const authUpdateBody = {
    store_name: RandomGenerator.paragraph({ sentences: 3 }),
    store_description: RandomGenerator.paragraph({ sentences: 5 }),
    support_email: typia.random<string & tags.Format<"email">>(),
    support_phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerProfile.IUpdate;

  const updatedProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellers.profile.update(
      connection,
      {
        sellerId,
        body: authUpdateBody,
      },
    );
  typia.assert(updatedProfile);

  // Validate that the store_name was updated as expected
  TestValidator.equals(
    "authenticated update should persist new store_name",
    updatedProfile.store_name,
    authUpdateBody.store_name,
  );
}
