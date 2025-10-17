import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller token refresh workflow with valid refresh token.
 *
 * This test validates the complete token refresh flow for sellers by first
 * creating a seller account which automatically issues initial JWT tokens
 * (access and refresh tokens), then using the refresh token to obtain a new
 * access token without re-authentication.
 *
 * Steps:
 *
 * 1. Create new seller account with registration data
 * 2. Extract refresh token from the initial authentication response
 * 3. Use refresh token to request new access token
 * 4. Validate refreshed token response contains correct seller information
 * 5. Verify token structure includes access, refresh, and expiration data
 */
export async function test_api_seller_token_refresh_with_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Create new seller account
  const sellerRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 6,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const initialAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerRegistration,
    });
  typia.assert(initialAuth);

  // Step 2: Validate initial authentication response
  TestValidator.predicate(
    "initial auth should have seller ID",
    initialAuth.id.length > 0,
  );
  TestValidator.equals(
    "initial auth email matches registration",
    initialAuth.email,
    sellerRegistration.email,
  );
  TestValidator.equals(
    "initial auth business name matches registration",
    initialAuth.business_name,
    sellerRegistration.business_name,
  );

  // Step 3: Extract refresh token and validate token structure
  const refreshToken: string = initialAuth.token.refresh;
  typia.assert<string>(refreshToken);
  TestValidator.predicate(
    "refresh token should not be empty",
    refreshToken.length > 0,
  );

  // Step 4: Use refresh token to get new access token
  const refreshedAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IShoppingMallSeller.IRefresh,
    });
  typia.assert(refreshedAuth);

  // Step 5: Validate refreshed authentication response
  TestValidator.equals(
    "refreshed auth seller ID matches initial",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "refreshed auth email matches initial",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "refreshed auth business name matches initial",
    refreshedAuth.business_name,
    initialAuth.business_name,
  );

  // Step 6: Validate refreshed token structure
  const newToken: IAuthorizationToken = refreshedAuth.token;
  typia.assert(newToken);

  TestValidator.predicate(
    "refreshed access token should not be empty",
    newToken.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should not be empty",
    newToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed expired_at should be valid date-time",
    newToken.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed refreshable_until should be valid date-time",
    newToken.refreshable_until.length > 0,
  );

  // Step 7: Verify that access token has changed (new token issued)
  TestValidator.notEquals(
    "new access token should differ from initial access token",
    newToken.access,
    initialAuth.token.access,
  );
}
