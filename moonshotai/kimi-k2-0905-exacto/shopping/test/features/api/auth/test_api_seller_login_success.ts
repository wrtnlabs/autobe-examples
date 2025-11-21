import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test successful seller authentication with valid business credentials.
 *
 * This comprehensive test validates the complete seller login workflow
 * including:
 *
 * 1. Generate realistic business seller credentials with valid email format
 * 2. Authenticate seller using the login API endpoint
 * 3. Verify response contains complete seller profile information
 * 4. Validate business verification status and commission rate
 * 5. Confirm JWT token generation for authenticated sessions
 * 6. Test that connection headers are properly updated with authorization
 *
 * The test ensures marketplace sellers receive proper authentication with
 * extended permissions for dashboard access and business operations.
 */
export async function test_api_seller_login_success(
  connection: api.IConnection,
) {
  // Generate realistic business seller login credentials
  const businessEmail = typia.random<string & tags.Format<"email">>();
  const loginCredentials = {
    email: businessEmail,
    password: "SecureSellerPass123!",
  } satisfies IShoppingMallSeller.ILogin;

  // Perform seller authentication
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginCredentials,
    });

  // Validate complete seller profile response
  typia.assert(sellerAuth);

  // Verify business information completeness
  TestValidator.predicate(
    "seller has valid UUID",
    typeof sellerAuth.id === "string" && sellerAuth.id.length === 36,
  );
  TestValidator.equals(
    "seller email matches login",
    sellerAuth.email,
    businessEmail,
  );
  TestValidator.predicate(
    "business name is provided",
    sellerAuth.business_name.length > 0,
  );
  TestValidator.predicate(
    "business registration number exists",
    sellerAuth.business_registration_number.length > 0,
  );
  TestValidator.predicate("tax ID is provided", sellerAuth.tax_id.length > 0);
  TestValidator.predicate("phone number exists", sellerAuth.phone.length > 0);
  TestValidator.predicate(
    "business type is specified",
    sellerAuth.business_type.length > 0,
  );

  // Validate verification and business status
  TestValidator.predicate(
    "verification status is valid",
    ["pending", "verified", "suspended", "rejected"].includes(
      sellerAuth.verification_status,
    ),
  );
  TestValidator.predicate(
    "commission rate is positive number",
    sellerAuth.commission_rate > 0 && sellerAuth.commission_rate <= 100,
  );
  TestValidator.predicate(
    "verification flag matches status",
    sellerAuth.is_verified === (sellerAuth.verification_status === "verified"),
  );

  // Confirm token authentication
  TestValidator.predicate(
    "has valid JWT access token",
    sellerAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid JWT refresh token",
    sellerAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration date",
    sellerAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refresh deadline",
    sellerAuth.token.refreshable_until.length > 0,
  );

  // Verify timestamps are valid
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    sellerAuth.created_at.includes("T") && sellerAuth.created_at.includes("Z"),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    sellerAuth.updated_at.includes("T") && sellerAuth.updated_at.includes("Z"),
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    sellerAuth.updated_at >= sellerAuth.created_at,
  );

  // Verify connection headers were updated with authorization
  TestValidator.predicate(
    "authorization header set",
    connection.headers?.Authorization === sellerAuth.token.access,
  );
}
