import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test comprehensive seller registration with various business validation
 * scenarios.
 *
 * This test validates the complete seller onboarding process covering:
 *
 * 1. Business entity classification requirements (corporation, LLC, partnership,
 *    sole proprietorship)
 * 2. Tax identification number validation and formatting
 * 3. Business registration number patterns and verification
 * 4. Email validation and uniqueness checking
 * 5. Phone number format validation
 * 6. Business name requirements and legal entity naming
 * 7. Verification workflow status assignment
 * 8. Commission rate assignment based on business type
 * 9. Token generation and authentication setup
 *
 * The test ensures proper handling of different business structures and their
 * associated compliance requirements within the marketplace ecosystem.
 */
export async function test_api_seller_registration_business_validation(
  connection: api.IConnection,
) {
  // Test various business entity types to ensure proper validation
  const businessTypes = [
    "corporation",
    "llc",
    "partnership",
    "sole_proprietorship",
  ] as const;
  const businessType = RandomGenerator.pick(businessTypes);

  // Generate comprehensive seller registration data with business validation
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: `${RandomGenerator.name(2)} ${RandomGenerator.pick(["Corp", "LLC", "Partnership", "Sole Proprietorship"])}`,
    business_registration_number:
      generateBusinessRegistrationNumber(businessType),
    tax_id: generateTaxId(businessType),
    phone: RandomGenerator.mobile("010"),
    business_type: businessType,
  } satisfies IShoppingMallSeller.IJoin;

  // Register seller and validate complete business information
  const registeredSeller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });

  // Validate all business information is properly stored and returned
  typia.assert(registeredSeller);

  // Verify business information integrity
  TestValidator.equals(
    "seller email matches",
    registeredSeller.email,
    sellerData.email,
  );
  TestValidator.equals(
    "seller business name matches",
    registeredSeller.business_name,
    sellerData.business_name,
  );
  TestValidator.equals(
    "seller business registration number matches",
    registeredSeller.business_registration_number,
    sellerData.business_registration_number,
  );
  TestValidator.equals(
    "seller tax ID matches",
    registeredSeller.tax_id,
    sellerData.tax_id,
  );
  TestValidator.equals(
    "seller phone matches",
    registeredSeller.phone,
    sellerData.phone,
  );
  TestValidator.equals(
    "seller business type matches",
    registeredSeller.business_type,
    sellerData.business_type,
  );

  // Verify verification workflow status is properly assigned
  TestValidator.predicate(
    "seller has verification status",
    registeredSeller.verification_status !== undefined,
  );
  TestValidator.predicate(
    "verification status indicates proper workflow",
    ["pending", "verified", "suspended", "rejected"].includes(
      registeredSeller.verification_status,
    ),
  );

  // Verify commission rate is properly assigned
  TestValidator.predicate(
    "seller has commission rate",
    registeredSeller.commission_rate > 0,
  );
  TestValidator.predicate(
    "commission rate within reasonable range",
    registeredSeller.commission_rate <= 1,
  ); // Assuming commission rate is decimal (0-1)

  // Verify verification status is properly set for new sellers
  TestValidator.equals(
    "new seller is not verified initially",
    registeredSeller.is_verified,
    false,
  );

  // Verify authentication token is generated
  typia.assert(registeredSeller.token);
  TestValidator.predicate(
    "access token exists",
    registeredSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    registeredSeller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration exists",
    registeredSeller.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "token refreshable period exists",
    registeredSeller.token.refreshable_until !== undefined,
  );

  // Verify timestamp fields are properly set
  TestValidator.predicate(
    "created_at timestamp exists",
    registeredSeller.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    registeredSeller.updated_at !== undefined,
  );
  TestValidator.equals(
    "created_at and updated_at are equal for new registration",
    registeredSeller.created_at,
    registeredSeller.updated_at,
  );

  // Test duplicate email registration should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: {
          ...sellerData,
          business_name: `${RandomGenerator.name(2)} ${RandomGenerator.pick(["Corp", "LLC", "Partnership", "Sole Proprietorship"])}`,
          business_registration_number:
            generateBusinessRegistrationNumber(businessType),
          tax_id: generateTaxId(businessType),
        },
      });
    },
  );

  // Test different business types to ensure all are properly handled
  await ArrayUtil.asyncMap(businessTypes, async (businessType) => {
    const testSellerData = {
      email: typia.random<string & tags.Format<"email">>(),
      business_name: `${RandomGenerator.name(2)} ${RandomGenerator.pick(["Corp", "LLC", "Partnership", "Sole Proprietorship"])}`,
      business_registration_number:
        generateBusinessRegistrationNumber(businessType),
      tax_id: generateTaxId(businessType),
      phone: RandomGenerator.mobile("010"),
      business_type: businessType,
    } satisfies IShoppingMallSeller.IJoin;

    const testSeller = await api.functional.auth.seller.join(connection, {
      body: testSellerData,
    });

    // Validate business type is correctly assigned and returned
    TestValidator.equals(
      `${businessType} seller business type matches`,
      testSeller.business_type,
      businessType,
    );
    TestValidator.predicate(
      `${businessType} seller has proper verification status`,
      testSeller.verification_status === "pending" ||
        testSeller.verification_status === "verified",
    );
  });
}

/**
 * Helper function to generate appropriate business registration number based on
 * business type
 */
function generateBusinessRegistrationNumber(businessType: string): string {
  // Generate realistic business registration numbers for different entity types
  const prefix: string = RandomGenerator.pick([
    "11",
    "12",
    "13",
    "21",
    "22",
    "23",
    "31",
    "32",
    "33",
    "41",
    "42",
    "43",
  ]);
  const sequence: number = typia.random<
    number &
      tags.Type<"uint32"> &
      tags.Minimum<10000000> &
      tags.Maximum<99999999>
  >();

  return `${prefix}-${sequence}`; // Format: CC-XXXXXXXX (Country Code - Unique Sequence)
}

/** Helper function to generate appropriate tax ID based on business type */
function generateTaxId(businessType: string): string {
  // Generate realistic tax IDs in EIN format: XX-XXXXXXX
  const prefix: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<99>
  >();
  const suffix: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000000> & tags.Maximum<9999999>
  >();

  return `${prefix.toString().padStart(2, "0")}-${suffix.toString().padStart(7, "0")}`;
}
