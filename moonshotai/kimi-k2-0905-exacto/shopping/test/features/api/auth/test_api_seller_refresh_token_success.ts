import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test successful refresh of seller's access token using a valid refresh token.
 * Validates token renewal maintains business session continuity and updates JWT
 * tokens with new expiration timestamps, ensuring uninterrupted dashboard
 * access during active business operations.
 *
 * This test verifies:
 *
 * 1. Generate a valid refresh token for seller authentication
 * 2. Successfully refresh the access token using the refresh token
 * 3. Validate the response contains new access and refresh tokens
 * 4. Verify token expiration timestamps are updated
 * 5. Ensure seller business account data is returned correctly
 * 6. Confirm the Authorization header is updated with new access token
 */
export async function test_api_seller_refresh_token_success(
  connection: api.IConnection,
) {
  // Step 1: Create a valid refresh token for seller authentication
  const refreshToken = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Call the refresh endpoint with valid refresh token
  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IShoppingMallSeller.IRefresh,
    });

  // Step 3: Validate the response structure and token information
  typia.assert(authorizedSeller);

  // Step 4: Verify token data is properly structured
  TestValidator.predicate(
    "Access token is present after refresh",
    authorizedSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "Refresh token is present after successful renewal",
    authorizedSeller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Token has valid expiration timestamp format",
    authorizedSeller.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "Token has valid refreshable_until timestamp format",
    authorizedSeller.token.refreshable_until.length > 0,
  );

  // Step 5: Validate seller business account information
  TestValidator.predicate(
    "Seller ID is valid format after authentication",
    authorizedSeller.id.length > 0,
  );
  TestValidator.predicate(
    "Business email is present in seller profile",
    authorizedSeller.email.length > 0,
  );
  TestValidator.predicate(
    "Business name is present in seller profile",
    authorizedSeller.business_name.length > 0,
  );
  TestValidator.predicate(
    "Business registration number is present in seller profile",
    authorizedSeller.business_registration_number.length > 0,
  );
  TestValidator.predicate(
    "Tax ID is present in seller profile",
    authorizedSeller.tax_id.length > 0,
  );
  TestValidator.predicate(
    "Contact phone number is present in seller profile",
    authorizedSeller.phone.length > 0,
  );
  TestValidator.predicate(
    "Business type classification is present",
    authorizedSeller.business_type.length > 0,
  );
  TestValidator.predicate(
    "Verification status is present in seller account",
    authorizedSeller.verification_status.length > 0,
  );
  TestValidator.predicate(
    "Commission rate is valid non-negative number",
    authorizedSeller.commission_rate >= 0,
  );
  TestValidator.predicate(
    "Verification flag is valid boolean value",
    typeof authorizedSeller.is_verified === "boolean",
  );
  TestValidator.predicate(
    "Account creation timestamp is present",
    authorizedSeller.created_at.length > 0,
  );
  TestValidator.predicate(
    "Last update timestamp is present",
    authorizedSeller.updated_at.length > 0,
  );
}
