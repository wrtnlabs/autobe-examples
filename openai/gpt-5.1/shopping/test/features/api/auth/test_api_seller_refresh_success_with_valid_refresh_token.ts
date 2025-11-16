import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerRefresh";

/**
 * Verify that a seller with a syntactically valid refresh token can obtain a
 * new authorized seller session payload.
 *
 * Business focus:
 *
 * - Ensure POST /auth/seller/refresh returns an IShoppingMallSeller.IAuthorized
 *   structure on success.
 * - Validate that the embedded seller summary is consistent with the top level
 *   scalar identity fields.
 * - Confirm that the issued authorization token fields are non-empty and have
 *   future-oriented expiry timestamps.
 *
 * Note: This test does not create or log in a real seller because the
 * join/login APIs are not part of the provided materials. Instead, it exercises
 * the refresh endpoint contract in isolation by supplying a random opaque
 * refreshToken string and validating the response shape and high-level
 * semantics.
 */
export async function test_api_seller_refresh_success_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Prepare refresh request payload
  const requestBody = {
    refreshToken: RandomGenerator.alphaNumeric(64),
  } satisfies IShoppingMallSellerRefresh.IRequest;

  // 2. Call the refresh API with the prepared body
  const authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: requestBody,
    });

  // 3. Validate structural/type correctness of the response
  typia.assert<IShoppingMallSeller.IAuthorized>(authorized);

  // 4. Validate seller identity and summary consistency
  const { seller } = authorized;
  typia.assert<IShoppingMallSeller.ISummary>(seller);

  TestValidator.equals(
    "seller id matches between top-level and summary",
    authorized.id,
    seller.id,
  );
  TestValidator.equals(
    "seller email matches between top-level and summary",
    authorized.email,
    seller.email,
  );
  TestValidator.equals(
    "seller store_name matches between top-level and summary",
    authorized.store_name,
    seller.store_name,
  );
  TestValidator.equals(
    "seller status matches between top-level and summary",
    authorized.status,
    seller.status,
  );

  // 5. Validate token fields
  const token: IAuthorizationToken = authorized.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token should be a non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    token.refresh.length > 0,
  );

  // 6. Validate temporal semantics of token expiry fields
  const now = Date.now();
  const accessExpiry = Date.parse(token.expired_at);
  const refreshExpiry = Date.parse(token.refreshable_until);

  TestValidator.predicate(
    "access token expiry should parse as a valid date-time",
    !Number.isNaN(accessExpiry),
  );
  TestValidator.predicate(
    "refresh token expiry should parse as a valid date-time",
    !Number.isNaN(refreshExpiry),
  );

  TestValidator.predicate(
    "access token expiry should be in the future relative to now",
    accessExpiry > now,
  );
  TestValidator.predicate(
    "refresh token expiry should be in the future relative to now",
    refreshExpiry >= accessExpiry,
  );
}
