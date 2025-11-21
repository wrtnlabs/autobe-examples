import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test retrieval of verified seller profiles to ensure marketplace trust
 * indicators are properly displayed.
 *
 * This test validates that verified seller information is correctly returned
 * through the API, including all trust indicators that customers need for
 * informed purchasing decisions. The test specifically focuses on:
 *
 * 1. Retrieving both verified and unverified seller profiles for comparison
 * 2. Validating verification status and trust indicators for different seller
 *    types
 * 3. Ensuring commission rates and business registration data are accessible
 * 4. Testing that marketplace trust indicators are properly structured
 * 5. Validating that all seller credibility information is properly returned
 *
 * The test uses random UUID generation for seller IDs and validates the
 * complete seller profile response structure, ensuring all business-critical
 * fields (verification_status, commission_rate, business_registration_number)
 * are present and properly formatted for customer decision-making support in
 * the marketplace.
 */
export async function test_api_seller_profile_with_verified_status(
  connection: api.IConnection,
) {
  // Generate random seller IDs for testing both seller types
  const verifiedSellerId = typia.random<string & tags.Format<"uuid">>();
  const unverifiedSellerId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve verified seller profile through the marketplace API
  const verifiedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.sellers.at(connection, {
      sellerId: verifiedSellerId,
    });

  // Retrieve unverified seller profile for comparison
  const unverifiedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.sellers.at(connection, {
      sellerId: unverifiedSellerId,
    });

  // Validate both responses match expected seller structure
  typia.assert(verifiedSeller);
  typia.assert(unverifiedSeller);

  // Validate verified seller trust indicators
  TestValidator.equals(
    "verified seller ID matches request",
    verifiedSeller.id,
    verifiedSellerId,
  );
  TestValidator.predicate(
    "verified seller has valid email format",
    typia.is<string & tags.Format<"email">>(verifiedSeller.email),
  );
  TestValidator.predicate(
    "verified seller has business name",
    verifiedSeller.business_name.length > 0,
  );

  // Validate verification status for marketplace credibility
  TestValidator.predicate(
    "verified seller status is 'verified'",
    verifiedSeller.verification_status === "verified",
  );
  TestValidator.predicate(
    "verified seller flag is true",
    verifiedSeller.is_verified === true,
  );

  // Validate business credentials for customer trust
  TestValidator.predicate(
    "verified seller has business registration",
    verifiedSeller.business_registration_number.length > 0,
  );
  TestValidator.predicate(
    "verified seller has tax ID",
    verifiedSeller.tax_id.length > 0,
  );
  TestValidator.predicate(
    "verified seller commission rate is valid",
    verifiedSeller.commission_rate >= 0,
  );

  // Validate unverified seller indicators
  TestValidator.equals(
    "unverified seller ID matches request",
    unverifiedSeller.id,
    unverifiedSellerId,
  );
  TestValidator.predicate(
    "unverified seller has valid email format",
    typia.is<string & tags.Format<"email">>(unverifiedSeller.email),
  );
  TestValidator.predicate(
    "unverified seller has business name",
    unverifiedSeller.business_name.length > 0,
  );
  TestValidator.predicate(
    "unverified seller status is not 'verified'",
    unverifiedSeller.verification_status !== "verified",
  );
  TestValidator.predicate(
    "unverified seller flag is false",
    unverifiedSeller.is_verified === false,
  );

  // Validate business type categorization for both seller types
  TestValidator.predicate(
    "verified seller has business type",
    verifiedSeller.business_type.length > 0,
  );
  TestValidator.predicate(
    "unverified seller has business type",
    unverifiedSeller.business_type.length > 0,
  );

  // Validate contact information presentation
  TestValidator.predicate(
    "verified seller phone valid",
    verifiedSeller.phone.length > 0,
  );
  TestValidator.predicate(
    "unverified seller phone valid",
    unverifiedSeller.phone.length > 0,
  );

  // Validate timestamp fields for profile tracking
  TestValidator.predicate(
    "verified seller timestamps valid",
    typia.is<string & tags.Format<"date-time">>(verifiedSeller.created_at) &&
      typia.is<string & tags.Format<"date-time">>(verifiedSeller.updated_at),
  );
  TestValidator.predicate(
    "unverified seller timestamps valid",
    typia.is<string & tags.Format<"date-time">>(unverifiedSeller.created_at) &&
      typia.is<string & tags.Format<"date-time">>(unverifiedSeller.updated_at),
  );

  // Test marketplace discrimination capability - customers should see clear differences
  TestValidator.notEquals(
    "verified and unverified sellers have different verification status",
    verifiedSeller.verification_status,
    unverifiedSeller.verification_status,
  );
  TestValidator.notEquals(
    "verified and unverified sellers have different verification flag",
    verifiedSeller.is_verified,
    unverifiedSeller.is_verified,
  );

  // Validate complete response structure for both seller types
  const expectedFields = [
    "id",
    "email",
    "business_name",
    "business_registration_number",
    "tax_id",
    "phone",
    "business_type",
    "verification_status",
    "commission_rate",
    "is_verified",
    "created_at",
    "updated_at",
  ];

  TestValidator.equals(
    "verified seller has all expected fields",
    Object.keys(verifiedSeller).sort(),
    expectedFields.sort(),
  );
  TestValidator.equals(
    "unverified seller has all expected fields",
    Object.keys(unverifiedSeller).sort(),
    expectedFields.sort(),
  );

  // Verify marketplace can distinguish seller types for customer decision support
  TestValidator.predicate(
    "verified seller has business credentials for trust",
    verifiedSeller.business_registration_number.length > 0 &&
      verifiedSeller.tax_id.length > 0,
  );
  TestValidator.predicate(
    "unverified seller has business credentials",
    unverifiedSeller.business_registration_number.length > 0 &&
      unverifiedSeller.tax_id.length > 0,
  );
}
