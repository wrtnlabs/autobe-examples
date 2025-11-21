import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test successful seller registration with complete valid business information.
 *
 * This test validates the complete seller registration flow including:
 *
 * 1. Creating a new seller account with valid business information
 * 2. Verifying the response contains all required business data
 * 3. Confirming verification status is set to pending
 * 4. Validating authentication token generation
 * 5. Testing duplicate registration prevention
 *
 * The test ensures sellers can successfully register with proper business
 * credentials and receive access tokens for marketplace operations.
 */
export async function test_api_seller_registration_success(
  connection: api.IConnection,
) {
  // Generate valid business registration data
  const businessEmail = typia.random<string & tags.Format<"email">>();
  const businessRegistrationNumber = typia.random<string>();
  const businessName = RandomGenerator.name();
  const taxId = typia.random<string>();
  const phoneNumber = RandomGenerator.mobile();
  const businessTypes = [
    "corporation",
    "llc",
    "partnership",
    "sole_proprietorship",
  ] as const;
  const businessType = RandomGenerator.pick(businessTypes);

  // Create seller registration request
  const registrationData = {
    email: businessEmail,
    business_name: businessName,
    business_registration_number: businessRegistrationNumber,
    tax_id: taxId,
    phone: phoneNumber,
    business_type: businessType,
  } satisfies IShoppingMallSeller.IJoin;

  // Register new seller
  const seller = await api.functional.auth.seller.join(connection, {
    body: registrationData,
  });

  // Validate response structure and data
  typia.assert(seller);

  // Verify seller ID is generated
  TestValidator.predicate(
    "seller ID should be generated",
    seller.id.length > 0,
  );
  TestValidator.predicate(
    "seller ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      seller.id,
    ),
  );

  // Verify business information matches registration data
  TestValidator.equals(
    "business email matches registration",
    seller.email,
    businessEmail,
  );
  TestValidator.equals(
    "business name matches registration",
    seller.business_name,
    businessName,
  );
  TestValidator.equals(
    "business registration number matches",
    seller.business_registration_number,
    businessRegistrationNumber,
  );
  TestValidator.equals("tax ID matches registration", seller.tax_id, taxId);
  TestValidator.equals(
    "phone number matches registration",
    seller.phone,
    phoneNumber,
  );
  TestValidator.equals(
    "business type matches registration",
    seller.business_type,
    businessType,
  );

  // Verify verification status is pending
  TestValidator.equals(
    "verification status should be pending",
    seller.verification_status,
    "pending",
  );
  TestValidator.predicate(
    "seller should not be verified initially",
    seller.is_verified === false,
  );

  // Verify commission rate is assigned
  TestValidator.predicate(
    "commission rate should be positive",
    seller.commission_rate > 0,
  );
  TestValidator.predicate(
    "commission rate should be reasonable",
    seller.commission_rate >= 0.1 && seller.commission_rate <= 0.3,
  );

  // Verify timestamps are generated
  TestValidator.predicate(
    "created_at should be generated",
    seller.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be generated",
    seller.updated_at.length > 0,
  );

  // Verify authentication token is provided
  TestValidator.predicate(
    "access token should be provided",
    seller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be provided",
    seller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration should be set",
    seller.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh expiration should be set",
    seller.token.refreshable_until.length > 0,
  );

  // Test duplicate registration is prevented
  await TestValidator.error(
    "duplicate registration should be rejected",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: registrationData,
      });
    },
  );
}
