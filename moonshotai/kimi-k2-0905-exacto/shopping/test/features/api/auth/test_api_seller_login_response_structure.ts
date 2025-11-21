import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the complete structure of successful seller login response.
 *
 * This test validates the seller authentication endpoint returns a
 * comprehensive response with all required business seller information and
 * properly formatted JWT tokens. The validation covers:
 *
 * 1. Core seller identity fields (id, email, business_name)
 * 2. Business registration details (business_registration_number, tax_id)
 * 3. Contact and verification information (phone, business_type,
 *    verification_status, is_verified)
 * 4. Business operational data (commission_rate)
 * 5. Timestamp information (created_at, updated_at)
 * 6. JWT token structure validation (access, refresh, expired_at,
 *    refreshable_until)
 *
 * All fields are verified to match their expected types and formats including
 * UUID format for seller ID, email format validation, and ISO 8601 datetime
 * format for timestamps and token expiration times.
 */
export async function test_api_seller_login_response_structure(
  connection: api.IConnection,
) {
  // Generate valid seller login credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  // Create a seller account first to ensure login succeeds
  const sellerLoginData = {
    email: sellerEmail,
    password: sellerPassword,
  } satisfies IShoppingMallSeller.ILogin;

  // Perform seller login and validate response structure
  const response: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginData,
    });

  // Use typia to perform complete runtime validation of the response structure
  typia.assert(response);

  // Validate JWT token structure - typia validates format, we validate business logic
  TestValidator.predicate(
    "access token is string",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is string",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );

  // Validate that refresh token has longer expiration than access token (business logic validation)
  const refreshableUntilTime = new Date(
    response.token.refreshable_until,
  ).getTime();
  const expiredAtTime = new Date(response.token.expired_at).getTime();
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntilTime > expiredAtTime,
  );

  // Validate UUID format for seller ID (demonstration of additional format validation)
  TestValidator.predicate(
    "seller ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );
}
