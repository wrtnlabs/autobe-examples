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
 * Validate that the admin seller profile read endpoint cannot be accessed
 * without authentication, even when the sellerId is valid.
 *
 * Business context
 *
 * - The path GET /shoppingMall/admin/sellers/{sellerId}/profile is part of the
 *   admin-facing backoffice surface for inspecting seller details.
 * - It must not be callable by anonymous clients; only authenticated admins
 *   should be able to use it.
 * - This test ensures that the authorization guard on that endpoint triggers
 *   before any sensitive seller profile data is returned.
 *
 * Test flow
 *
 * 1. Register a seller so that we have a valid sellerId for the profile URL.
 *
 *    - Call api.functional.auth.seller.join with a random but valid
 *         IShoppingMallSellerAuthJoin.IRequest payload.
 *    - Capture seller.id from the IShoppingMallSeller.IAuthorized response.
 *    - This call will also attach a seller access token to the shared connection
 *         headers as a side effect, which we must not rely on for the
 *         unauthorized request.
 * 2. Register an admin account as a dependency setup.
 *
 *    - Call api.functional.auth.admin.join with a random
 *         IShoppingMallAdminJoin.ICreate payload.
 *    - Validate the returned IShoppingMallAdmin.IAuthorized using typia.assert to
 *         ensure the join pipeline works, but do not use this admin token for
 *         the unauthorized request.
 * 3. Create an unauthenticated connection object.
 *
 *    - To simulate a caller with no Authorization header, build a shallow copy of
 *         the existing connection with an empty headers object: const
 *         unauthConnection: api.IConnection = { ...connection, headers: {} };
 *    - Per hard rules, we then avoid touching connection.headers or
 *         unauthConnection.headers any further.
 * 4. Attempt to read the seller profile with no authentication.
 *
 *    - Call api.functional.shoppingMall.admin.sellers.profile.at using
 *         unauthConnection and the real sellerId from step 1.
 *    - Wrap the call in TestValidator.error with an async closure and await it to
 *         assert that the request fails.
 *    - We must not assert on specific HTTP status codes (401/403/etc.) or on error
 *         body structures; the only contract we enforce is that the call does
 *         not succeed and instead throws.
 * 5. No positive-path assertion in this test.
 *
 *    - Although we have an admin account, we intentionally do not perform a separate
 *         authenticated call in this scenario to keep the focus on the
 *         negative, unauthorized behavior and to avoid manually manipulating
 *         Authorization headers.
 */
export async function test_api_admin_cannot_access_seller_profile_without_authentication(
  connection: api.IConnection,
) {
  // 1. Register a seller to obtain a valid sellerId.
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: typia.random<IShoppingMallSellerAuthJoin.IRequest>(),
    });
  typia.assert(sellerAuthorized);

  // 2. Register an admin as dependency setup (not used for unauthorized call).
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdminJoin.ICreate>(),
    });
  typia.assert(adminAuthorized);

  // 3. Create an unauthenticated connection by clearing headers.
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt to access the protected admin seller profile endpoint without
  //    any Authorization header and assert that it fails.
  await TestValidator.error(
    "admin seller profile is not accessible without authentication",
    async () => {
      await api.functional.shoppingMall.admin.sellers.profile.at(
        unauthConnection,
        {
          sellerId: sellerAuthorized.id,
        },
      );
    },
  );
}
