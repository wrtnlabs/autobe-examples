import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_login_business_verification_status(
  connection: api.IConnection,
) {
  // Test that seller login returns complete business verification information.
  // Validates that authentication response includes accurate business details,
  // verification status, and tokens for secure marketplace operations.

  // Generate realistic seller login credentials (real sellers would provide these)
  const loginData = {
    email: RandomGenerator.pick([
      "merchant@business.com",
      "seller@trade.co",
      "vendor@marketplace.com",
    ]),
    password: "1234",
  } satisfies IShoppingMallSeller.ILogin;

  // Attempt seller authentication
  const authResult = await api.functional.auth.seller.login(connection, {
    body: loginData,
  });
  typia.assert(authResult);

  // Validate complete return structure includes business verification information
  TestValidator.predicate(
    "authentication includes business verification status",
    typeof authResult.verification_status === "string" &&
      authResult.verification_status.length > 0,
  );

  TestValidator.predicate(
    "business name provided in authentication response",
    typeof authResult.business_name === "string" &&
      authResult.business_name.length > 0,
  );

  TestValidator.predicate(
    "business registration number included",
    typeof authResult.business_registration_number === "string" &&
      authResult.business_registration_number.length > 0,
  );

  TestValidator.predicate(
    "tax ID provided for business operations",
    typeof authResult.tax_id === "string" && authResult.tax_id.length > 0,
  );

  TestValidator.predicate(
    "business type classification included",
    typeof authResult.business_type === "string" &&
      authResult.business_type.length > 0,
  );

  TestValidator.predicate(
    "commission rate provided for marketplace operations",
    typeof authResult.commission_rate === "number" &&
      authResult.commission_rate >= 0,
  );

  // Validate authentication token security
  TestValidator.predicate(
    "access token provided for seller operations",
    typeof authResult.token.access === "string" &&
      authResult.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token provided for session management",
    typeof authResult.token.refresh === "string" &&
      authResult.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token expiration timestamp provided",
    typeof authResult.token.expired_at === "string" &&
      authResult.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "token refreshable until timestamp provided",
    typeof authResult.token.refreshable_until === "string" &&
      authResult.token.refreshable_until.length > 0,
  );

  // Validate verification state indicators
  TestValidator.predicate(
    "verification boolean flag provided",
    typeof authResult.is_verified === "boolean",
  );

  TestValidator.predicate(
    "seller UUID identifier provided",
    typeof authResult.id === "string" && authResult.id.length > 0,
  );

  // Validate timestamp information
  TestValidator.predicate(
    "account creation timestamp provided",
    typeof authResult.created_at === "string" &&
      authResult.created_at.length > 0,
  );

  TestValidator.predicate(
    "last update timestamp provided",
    typeof authResult.updated_at === "string" &&
      authResult.updated_at.length > 0,
  );

  // Test consistency of business verification data
  if (authResult.is_verified === true) {
    TestValidator.predicate(
      "verified sellers have valid verification status",
      authResult.verification_status === "verified",
    );
  } else {
    TestValidator.predicate(
      "non-verified sellers have appropriate verification status",
      authResult.verification_status !== "verified",
    );
  }

  // Test login with different merchant credentials to ensure consistent structure
  const secondLoginData = {
    email: RandomGenerator.pick([
      "retailer@commerce.org",
      "wholesaler@supply.co",
    ]),
    password: "1234",
  } satisfies IShoppingMallSeller.ILogin;

  const secondAuthResult = await api.functional.auth.seller.login(connection, {
    body: secondLoginData,
  });
  typia.assert(secondAuthResult);

  TestValidator.equals(
    "consistent business information structure across different sellers",
    secondAuthResult.business_name.length > 0,
    true,
  );

  TestValidator.equals(
    "verification status consistently provided",
    typeof secondAuthResult.verification_status === "string",
    true,
  );

  // Validate error handling for invalid credentials
  await TestValidator.error(
    "invalid seller credentials should fail authentication",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: "invalid@test.com",
          password: "wrongpassword",
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );
}
