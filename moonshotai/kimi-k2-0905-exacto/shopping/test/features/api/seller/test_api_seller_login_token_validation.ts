import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test JWT token generation and format validation for seller authentication.
 *
 * Validates access token and refresh token formats, proper expiration
 * timestamps, and that token payload includes correct seller permissions and
 * business information. Ensures tokens can be used successfully for subsequent
 * authenticated requests.
 */
export async function test_api_seller_login_token_validation(
  connection: api.IConnection,
) {
  // Generate valid seller login credentials with proper email format
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  // Create login request body with valid credentials
  const loginCredentials = {
    email: sellerEmail,
    password: sellerPassword,
  } satisfies IShoppingMallSeller.ILogin;

  // Perform seller authentication login
  const authorizedResponse = await api.functional.auth.seller.login(
    connection,
    {
      body: loginCredentials,
    },
  );

  // Validate complete seller authorized response structure
  typia.assert(authorizedResponse);

  // Validate token structure exists and is complete
  TestValidator.predicate(
    "token structure exists",
    authorizedResponse.token !== null,
  );
  TestValidator.predicate(
    "access token is non-empty",
    authorizedResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorizedResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expiration timestamp exists",
    authorizedResponse.token.expired_at !== null,
  );
  TestValidator.predicate(
    "refreshable until timestamp exists",
    authorizedResponse.token.refreshable_until !== null,
  );

  // Validate token format using JWT token patterns
  const accessTokenParts = authorizedResponse.token.access.split(".");
  const refreshTokenParts = authorizedResponse.token.refresh.split(".");
  TestValidator.predicate(
    "access token has JWT format (3 parts)",
    accessTokenParts.length === 3,
  );
  TestValidator.predicate(
    "refresh token has JWT format (3 parts)",
    refreshTokenParts.length === 3,
  );

  // Validate token expiration timestamps
  const currentTime = new Date();
  const expiredAt = new Date(authorizedResponse.token.expired_at);
  const refreshableUntil = new Date(authorizedResponse.token.refreshable_until);
  TestValidator.predicate("expired_at is in future", expiredAt > currentTime);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil > currentTime,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );

  // Validate seller business information
  TestValidator.predicate("seller ID exists", authorizedResponse.id !== null);
  TestValidator.predicate(
    "seller email matches login",
    authorizedResponse.email === loginCredentials.email,
  );
  TestValidator.predicate(
    "business name exists",
    authorizedResponse.business_name !== null,
  );
  TestValidator.predicate(
    "business registration number exists",
    authorizedResponse.business_registration_number !== null,
  );
  TestValidator.predicate("tax ID exists", authorizedResponse.tax_id !== null);
  TestValidator.predicate("phone exists", authorizedResponse.phone !== null);
  TestValidator.predicate(
    "business verification status exists",
    authorizedResponse.verification_status !== null,
  );
  TestValidator.predicate(
    "commission rate is valid number",
    typeof authorizedResponse.commission_rate === "number" &&
      authorizedResponse.commission_rate >= 0,
  );
  TestValidator.predicate(
    "verification status is boolean",
    typeof authorizedResponse.is_verified === "boolean",
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at timestamp exists",
    authorizedResponse.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    authorizedResponse.updated_at !== null,
  );

  // Test that authentication token is automatically set in connection headers
  TestValidator.predicate(
    "authorization header is present",
    connection.headers?.Authorization !== undefined,
  );
  TestValidator.predicate(
    "authorization header matches access token",
    connection.headers?.Authorization === authorizedResponse.token.access,
  );
}
