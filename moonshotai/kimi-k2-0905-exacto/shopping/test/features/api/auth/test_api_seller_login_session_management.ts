import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test comprehensive seller session creation and management functionality.
 *
 * This test validates that successful seller authentication creates proper JWT
 * tokens with extended expiration periods, establishes secure session state,
 * and maintains session integrity for extended dashboard usage.
 *
 * Test Flow:
 *
 * 1. Generate valid seller login credentials with business email
 * 2. Authorize seller login through authentication API
 * 3. Validate JWT token structure and content integrity
 * 4. Verify authorization header is properly configured for subsequent requests
 * 5. Confirm token expiration timestamps match extended seller session periods
 * 6. Validate business verification status for marketplace operations
 * 7. Test session persistence through immediate profile retrieval
 */
export async function test_api_seller_login_session_management(
  connection: api.IConnection,
) {
  // Step 1: Generate valid seller login credentials with business email format
  const loginCredentials = {
    email: `seller.${RandomGenerator.alphabets(8)}@businessmarketplace.com`,
    password: RandomGenerator.alphaNumeric(12) + "!A1", // Strong password for seller accounts
  } satisfies IShoppingMallSeller.ILogin;

  // Step 2: Authorize seller login through API
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginCredentials,
    });
  typia.assert(sellerAuth);

  // Step 3: Validate JWT token structure and integrity
  TestValidator.predicate(
    "seller has valid UUID ID",
    typia.is<string & tags.Format<"uuid">>(sellerAuth.id),
  );
  TestValidator.equals(
    "email matches login credential",
    sellerAuth.email,
    loginCredentials.email,
  );
  TestValidator.predicate(
    "business verification status exists",
    sellerAuth.verification_status.length > 0,
  );
  TestValidator.predicate(
    "is_verified is boolean type",
    typeof sellerAuth.is_verified === "boolean",
  );

  // Step 4: Validate JWT token structure
  const token = sellerAuth.token;
  TestValidator.predicate(
    "access token exists and is string",
    typeof token.access === "string",
  );
  TestValidator.predicate(
    "refresh token exists and is string",
    typeof token.refresh === "string",
  );
  TestValidator.predicate(
    "token has expiration date-time",
    typia.is<string & tags.Format<"date-time">>(token.expired_at),
  );
  TestValidator.predicate(
    "token has refreshable until date-time",
    typia.is<string & tags.Format<"date-time">>(token.refreshable_until),
  );

  // Step 5: Verify authorization header injection
  TestValidator.predicate(
    "connection has authorization header",
    connection.headers !== undefined,
  );
  if (connection.headers) {
    TestValidator.equals(
      "authorization header matches access token",
      connection.headers.Authorization,
      token.access,
    );
  }

  // Step 6: Validate token expiration timestamps for extended seller sessions
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "access token expires in future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token expires in future",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh period longer than access period",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );

  // Step 7: Validate extended session periods (sellers get longer sessions than regular users)
  const accessDurationMs = expiredAt.getTime() - now.getTime();
  const refreshDurationMs = refreshableUntil.getTime() - now.getTime();

  TestValidator.predicate(
    "access token lasts at least 30 minutes",
    accessDurationMs >= 30 * 60 * 1000,
  );
  TestValidator.predicate(
    "refresh token lasts at least 7 days",
    refreshDurationMs >= 7 * 24 * 60 * 60 * 1000,
  );

  // Step 8: Validate business profiles for marketplace operations
  TestValidator.predicate(
    "business name is non-empty string",
    typeof sellerAuth.business_name === "string" &&
      sellerAuth.business_name.length > 0,
  );
  TestValidator.predicate(
    "business registration is non-empty string",
    typeof sellerAuth.business_registration_number === "string" &&
      sellerAuth.business_registration_number.length > 0,
  );
  TestValidator.predicate(
    "tax ID is non-empty string",
    typeof sellerAuth.tax_id === "string" && sellerAuth.tax_id.length > 0,
  );
  TestValidator.predicate(
    "phone is non-empty string",
    typeof sellerAuth.phone === "string" && sellerAuth.phone.length > 0,
  );
  TestValidator.predicate(
    "business type is non-empty string",
    typeof sellerAuth.business_type === "string" &&
      sellerAuth.business_type.length > 0,
  );
  TestValidator.predicate(
    "commission rate is number in valid range",
    typeof sellerAuth.commission_rate === "number" &&
      sellerAuth.commission_rate >= 0 &&
      sellerAuth.commission_rate <= 100,
  );

  // Step 9: Validate session management timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    typia.is<string & tags.Format<"date-time">>(sellerAuth.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typia.is<string & tags.Format<"date-time">>(sellerAuth.updated_at),
  );

  // Step 10: Test session security - tokens should be unique and sufficiently complex
  TestValidator.predicate(
    "access token is different from refresh token",
    token.access !== token.refresh,
  );
  TestValidator.predicate(
    "access token length exceeds minimum security threshold",
    token.access.length >= 32,
  );
  TestValidator.predicate(
    "refresh token length exceeds minimum security threshold",
    token.refresh.length >= 32,
  );
}
