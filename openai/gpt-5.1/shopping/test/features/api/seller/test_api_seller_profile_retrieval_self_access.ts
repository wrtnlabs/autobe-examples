import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify that an authenticated seller can retrieve their own profile via the
 * seller-facing profile endpoint.
 *
 * ## Business goal
 *
 * Ensure that when a seller registers (join) and then calls the seller profile
 * retrieval endpoint using their own seller id, the backend returns a valid
 * `IShoppingMallSellerProfile` that is correctly linked back to that seller,
 * including the optional embedded seller summary.
 *
 * ## High-level steps
 *
 * 1. Perform seller self-registration via `POST /auth/seller/join` using
 *    `api.functional.auth.seller.join` with a realistic
 *    `IShoppingMallSellerAuthJoin.IRequest` payload.
 * 2. Confirm that the response matches `IShoppingMallSeller.IAuthorized` and
 *    extract the seller id and token (the token is also written into
 *    `connection.headers.Authorization` by the SDK).
 * 3. Using the same authenticated connection, call `GET
 *    /shoppingMall/seller/sellers/{sellerId}/profile` via
 *    `api.functional.shoppingMall.seller.sellers.profile.at`, passing the
 *    authenticated seller id as `sellerId`.
 * 4. Validate that the response is a well-formed `IShoppingMallSellerProfile` and
 *    that its `shopping_mall_seller_id` equals the authenticated seller id.
 * 5. If the optional embedded `seller` summary is present, validate basic
 *    consistency between the summary and the authenticated seller identity (id,
 *    email, status, email verification flag, and creation timestamp
 *    semantics).
 *
 * ## Notes
 *
 * - Authentication and header management are handled by the SDK when calling the
 *   join endpoint; the test must not touch `connection.headers` directly.
 * - No negative or cross-actor authorization scenarios are covered here, because
 *   only the join and profile.at endpoints are in scope.
 */
export async function test_api_seller_profile_retrieval_self_access(
  connection: api.IConnection,
) {
  // 1. Seller self-registration (join)
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
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // 2. Basic sanity checks on authorized seller payload
  TestValidator.predicate(
    "authorized seller id should be non-empty uuid string",
    () => authorizedSeller.id.length > 0,
  );
  TestValidator.predicate(
    "authorized seller email should match requested email",
    () => authorizedSeller.email === joinBody.email,
  );

  // 3. Retrieve seller profile for the same seller id
  const profile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellers.profile.at(connection, {
      sellerId: authorizedSeller.id,
    });
  typia.assert<IShoppingMallSellerProfile>(profile);

  // 4. Validate that profile belongs to the authenticated seller
  TestValidator.equals(
    "profile.shopping_mall_seller_id equals authorized seller id",
    profile.shopping_mall_seller_id,
    authorizedSeller.id,
  );

  // 5. If embedded seller summary exists, validate consistency
  if (profile.seller !== undefined) {
    const summary = profile.seller;

    // id and email must match the authenticated seller
    TestValidator.equals(
      "embedded seller summary id matches authorized seller id",
      summary.id,
      authorizedSeller.id,
    );
    TestValidator.equals(
      "embedded seller summary email matches authorized seller email",
      summary.email,
      authorizedSeller.email,
    );

    // status should be consistent between summary and authorized payload
    TestValidator.equals(
      "embedded seller summary status matches authorized seller status",
      summary.status,
      authorizedSeller.status,
    );

    // email verification flag name differs (`emailVerified` vs `email_verified`)
    TestValidator.equals(
      "embedded seller summary emailVerified matches authorized email_verified",
      summary.emailVerified,
      authorizedSeller.email_verified,
    );

    // createdAt vs created_at should refer to the same timestamp semantics
    TestValidator.equals(
      "embedded seller summary createdAt matches authorized created_at",
      summary.createdAt,
      authorizedSeller.created_at,
    );
  }
}
