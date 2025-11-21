import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration with comprehensive business profile.
 *
 * This test validates the complete seller onboarding process by registering a
 * new merchant account with all required business information. It ensures that
 * sellers can successfully create accounts with proper business verification
 * details including business registration numbers, tax identification, and
 * contact information. The test verifies that the system correctly processes
 * seller applications and establishes appropriate verification status for
 * marketplace compliance and trust indicators.
 *
 * Test scenarios covered:
 *
 * 1. Generate comprehensive business profile data with valid formats
 * 2. Submit seller registration with complete business information
 * 3. Validate response includes all expected business details and authentication
 *    token
 * 4. Verify seller account is properly created with verification status
 * 5. Confirm JWT token is generated for immediate seller dashboard access
 * 6. Test business type classification and commission rate assignment
 */
export async function test_api_seller_join_with_complete_business_profile(
  connection: api.IConnection,
) {
  // Create comprehensive business registration data
  const uniqueId = RandomGenerator.alphaNumeric(8);
  const businessEmail = `seller-${uniqueId}@example.com`;
  const businessName = `Tech Solutions ${RandomGenerator.name(2)}`;
  const registrationNumber = `${RandomGenerator.alphaNumeric(10)}`;
  const taxIdNumber = `${RandomGenerator.alphaNumeric(9)}`;
  const businessPhone = RandomGenerator.mobile();

  // Generate business type from common classifications
  const businessTypes = [
    "Corporation",
    "Limited Liability Company",
    "Partnership",
    "Sole Proprietorship",
    "Small Business Corporation",
  ] as const;
  const businessType = RandomGenerator.pick(businessTypes);

  // Prepare complete seller registration payload
  const registrationPayload = {
    email: businessEmail,
    business_name: businessName,
    business_registration_number: registrationNumber,
    tax_id: taxIdNumber,
    phone: businessPhone,
    business_type: businessType,
  } satisfies IShoppingMallSeller.IJoin;

  // Execute seller registration API call
  const registeredSeller = await api.functional.auth.seller.join(connection, {
    body: registrationPayload,
  });

  // Validate successful registration response
  typia.assert(registeredSeller);

  // Verify critical business profile information matches input
  TestValidator.equals(
    "seller email matches input",
    registeredSeller.email,
    businessEmail,
  );
  TestValidator.equals(
    "business name matches input",
    registeredSeller.business_name,
    businessName,
  );
  TestValidator.equals(
    "business registration matches",
    registeredSeller.business_registration_number,
    registrationNumber,
  );
  TestValidator.equals(
    "tax ID matches input",
    registeredSeller.tax_id,
    taxIdNumber,
  );
  TestValidator.equals(
    "phone number matches input",
    registeredSeller.phone,
    businessPhone,
  );
  TestValidator.equals(
    "business type matches input",
    registeredSeller.business_type,
    businessType,
  );

  // Validate verification and account status
  TestValidator.predicate(
    "verification status is provided",
    registeredSeller.verification_status !== "",
  );
  TestValidator.predicate(
    "is_verified is boolean",
    typeof registeredSeller.is_verified === "boolean",
  );
  TestValidator.predicate(
    "commission rate is positive",
    typeof registeredSeller.commission_rate === "number" &&
      registeredSeller.commission_rate > 0,
  );

  // Test authorization token generation
  TestValidator.predicate(
    "access token is provided",
    registeredSeller.token.access !== "",
  );
  TestValidator.predicate(
    "refresh token is provided",
    registeredSeller.token.refresh !== "",
  );
  TestValidator.predicate(
    "token has expiration",
    registeredSeller.token.expired_at !== "",
  );
  TestValidator.predicate(
    "refresh token has expiration",
    registeredSeller.token.refreshable_until !== "",
  );

  // Validate timestamp fields
  TestValidator.predicate(
    "created_at has valid format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(registeredSeller.created_at),
  );
  TestValidator.predicate(
    "updated_at has valid format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(registeredSeller.updated_at),
  );

  // Verify connection headers are updated with authentication
  TestValidator.predicate(
    "connection has Authorization header",
    connection.headers?.Authorization === registeredSeller.token.access,
  );
}
