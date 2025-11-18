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
 * Verify that a seller (non-admin actor) cannot access the admin-only seller
 * profile endpoint using their own token.
 *
 * Business goal
 *
 * - Ensure that `/shoppingMall/admin/sellers/{sellerId}/profile` is protected by
 *   admin authorization and is not callable with a seller JWT, even when the
 *   `sellerId` belongs to the authenticated seller.
 *
 * High-level steps
 *
 * 1. Join an admin once to satisfy dependency that an admin actor exists.
 * 2. Join a seller and obtain `IShoppingMallSeller.IAuthorized` plus the
 *    side-effect that the connection now carries the seller access token.
 * 3. With this seller token, attempt to call the admin-only profile endpoint using
 *    the seller's own `id` as `sellerId`.
 * 4. Assert that the call fails with an authorization-style error using
 *    `TestValidator.error`, without checking specific HTTP status codes.
 */
export async function test_api_admin_cannot_access_seller_profile_with_non_admin_token(
  connection: api.IConnection,
) {
  // 1. Ensure there is at least one admin in the system by executing
  //    POST /auth/admin/join. This will set the connection's token to
  //    an admin token temporarily; we will overwrite it with the seller
  //    token in the next step.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a seller via POST /auth/seller/join. After this call,
  //    the SDK will set connection.headers.Authorization to the seller
  //    access token, which is what we need for the negative test.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Sanity check: the seller id must be a UUID and will be used as the
  // path parameter for the admin-only profile endpoint.
  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;

  // 3. Attempt to call the admin-only endpoint with the seller token.
  //    This should fail with an authorization error, because the
  //    connection now holds a seller JWT instead of an admin token.
  await TestValidator.error(
    "seller token cannot access admin seller profile endpoint",
    async () => {
      await api.functional.shoppingMall.admin.sellers.profile.at(connection, {
        sellerId,
      });
    },
  );
}
