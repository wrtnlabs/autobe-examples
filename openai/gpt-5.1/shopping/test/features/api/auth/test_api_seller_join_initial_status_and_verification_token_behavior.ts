import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate initial seller lifecycle status and authorization token behavior on
 * join.
 *
 * Business context:
 *
 * - A seller registers via POST /auth/seller/join with credentials and basic
 *   profile.
 * - Backend creates auth credentials, a seller profile, may seed email
 *   verification tokens, and returns an IShoppingMallSeller.IAuthorized session
 *   object.
 * - The SDK also stores the access token into connection.headers.Authorization,
 *   but this test treats that as an internal concern and does not touch headers
 *   directly.
 *
 * What this test validates:
 *
 * 1. A valid IShoppingMallSellerJoin.IRequest payload successfully registers a
 *    seller.
 * 2. The response strictly matches IShoppingMallSeller.IAuthorized.
 * 3. The seller has a non-empty lifecycle status (e.g., "pending" or "active").
 * 4. The embedded IAuthorizationToken structure is coherent and contains non-empty
 *    access/refresh tokens and valid ISO date-time expiry fields.
 * 5. The seller summary projection matches the top-level scalar fields.
 *
 * Note: The scenario mentions possible email verification token records, but no
 * API for introspecting them is available in this test context. Therefore, this
 * test treats the verification-token seeding as an internal concern and
 * validates only observable surface behavior: seller status and returned token
 * fields.
 */
export async function test_api_seller_join_initial_status_and_verification_token_behavior(
  connection: api.IConnection,
) {
  // 1. Prepare a realistic seller join request payload.
  const requestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  // 2. Call POST /auth/seller/join and capture the authorized seller session.
  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: requestBody,
    });

  // 3. Validate the response type and structure.
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // 4. Business validations on core seller fields.
  TestValidator.predicate(
    "seller id should be a non-empty UUID string",
    () => authorizedSeller.id.length > 0,
  );
  TestValidator.predicate(
    "seller email should echo the join request email",
    () => authorizedSeller.email === requestBody.email,
  );
  TestValidator.predicate(
    "seller store_name should echo the join request storeName",
    () => authorizedSeller.store_name === requestBody.storeName,
  );
  TestValidator.predicate(
    "seller status should be a non-empty lifecycle string",
    () => authorizedSeller.status.length > 0,
  );

  // Ensure summary projection is consistent with top-level fields.
  TestValidator.equals(
    "summary id should match top-level id",
    authorizedSeller.id,
    authorizedSeller.seller.id,
  );
  TestValidator.equals(
    "summary email should match top-level email",
    authorizedSeller.email,
    authorizedSeller.seller.email,
  );
  TestValidator.equals(
    "summary store_name should match top-level store_name",
    authorizedSeller.store_name,
    authorizedSeller.seller.store_name,
  );
  TestValidator.equals(
    "summary status should match top-level status",
    authorizedSeller.status,
    authorizedSeller.seller.status,
  );

  // 5. Validate token structure semantics.
  const token: IAuthorizationToken = authorizedSeller.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token string should be non-empty",
    () => token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token string should be non-empty",
    () => token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry should be a non-empty ISO date-time string",
    () => token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiry should be a non-empty ISO date-time string",
    () => token.refreshable_until.length > 0,
  );
}
