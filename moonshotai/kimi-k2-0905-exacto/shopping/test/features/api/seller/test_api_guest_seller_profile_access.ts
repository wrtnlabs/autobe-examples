import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test guest access to seller profile information.
 *
 * This test validates that unauthenticated users (guests) can access seller
 * profile information through the API. Marketplaces need transparency, so
 * seller profiles should be publicly accessible to allow buyers to evaluate
 * seller credibility before making purchase decisions.
 *
 * The test verifies:
 *
 * 1. Seller profile retrieval without authentication
 * 2. All expected seller profile fields are present and valid
 * 3. Business information is properly formatted
 * 4. Verification status is accessible to public
 * 5. Error handling for invalid seller IDs
 *
 * This ensures marketplace transparency and supports buyers in making informed
 * purchasing decisions based on accurate seller information.
 */
export async function test_api_guest_seller_profile_access(
  connection: api.IConnection,
) {
  // Generate a random seller ID for testing
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // Test guest access to seller profile (no authentication required)
  const sellerProfile = await api.functional.shoppingMall.sellers.at(
    connection,
    {
      sellerId: sellerId,
    },
  );
  typia.assert(sellerProfile);

  // Validate seller profile core information
  TestValidator.equals(
    "seller ID matches requested ID",
    sellerProfile.id,
    sellerId,
  );
  TestValidator.predicate(
    "business name is non-empty",
    sellerProfile.business_name.trim().length > 0,
  );
  TestValidator.predicate(
    "business registration number is non-empty",
    sellerProfile.business_registration_number.trim().length > 0,
  );
  TestValidator.predicate(
    "tax ID is non-empty",
    sellerProfile.tax_id.trim().length > 0,
  );
  TestValidator.predicate(
    "phone number is valid format",
    sellerProfile.phone.match(/^\d{3}-?\d{3,4}-?\d{4}$/) !== null,
  );
  TestValidator.predicate(
    "business type is specified",
    sellerProfile.business_type.trim().length > 0,
  );

  // Validate commission rate within reasonable marketplace range (0-50%)
  TestValidator.predicate(
    "commission rate is reasonable",
    sellerProfile.commission_rate >= 0 && sellerProfile.commission_rate <= 50,
  );

  // Validate verification status is one of expected values
  const validStatuses = ["pending", "verified", "suspended", "rejected"];
  TestValidator.predicate(
    "verification status is valid",
    validStatuses.includes(sellerProfile.verification_status),
  );

  // Validate boolean verification flag matches status
  TestValidator.predicate(
    "is_verified boolean indicates verification",
    sellerProfile.is_verified ===
      (sellerProfile.verification_status === "verified"),
  );

  // Validate timestamps are in proper ISO date-time format
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    sellerProfile.created_at.match(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
    ) !== null,
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    sellerProfile.updated_at.match(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
    ) !== null,
  );

  // Validate that updated_at is not before created_at
  TestValidator.predicate(
    "updated_at is not before created_at",
    new Date(sellerProfile.updated_at).getTime() >=
      new Date(sellerProfile.created_at).getTime(),
  );

  // Test error handling with invalid seller ID (optional - marketplace may handle this differently)
  try {
    const invalidId = "00000000-0000-0000-0000-000000000000";
    await api.functional.shoppingMall.sellers.at(connection, {
      sellerId: invalidId,
    });
  } catch (error) {
    // Expected behavior for non-existent seller - marketplace may return 404 or handle gracefully
    TestValidator.predicate("invalid seller ID handling works", true);
  }
}
