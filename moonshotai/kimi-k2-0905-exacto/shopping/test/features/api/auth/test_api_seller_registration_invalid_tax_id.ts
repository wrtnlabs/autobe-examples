import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration rejection with invalid tax identification number.
 *
 * This test validates that the seller registration endpoint properly rejects
 * invalid tax ID formats for business compliance requirements. It tests:
 *
 * 1. Invalid tax ID format acceptance
 * 2. Business entity authentication failure
 * 3. Regulatory compliance verification
 * 4. Appropriate error response handling
 *
 * The test uses valid business registration data but provides an invalid tax
 * identification number to verify the system's validation logic maintains
 * proper fiscal compliance requirements.
 */
export async function test_api_seller_registration_invalid_tax_id(
  connection: api.IConnection,
) {
  // Generate valid business information with invalid tax ID
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.name(2),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    tax_id: "INVALID-TAX-ID-FORMAT", // Invalid format for tax ID validation
    phone: RandomGenerator.mobile(),
    business_type: RandomGenerator.pick([
      "corporation",
      "llc",
      "partnership",
      "sole_proprietorship",
    ] as const),
  } satisfies IShoppingMallSeller.IJoin;

  // Attempt registration with invalid tax ID - should fail
  await TestValidator.error(
    "seller registration should reject invalid tax ID format",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: sellerData,
      });
    },
  );

  // Test additional invalid tax ID patterns
  const invalidTaxIds = [
    "123", // Too short
    "12345678901234567890", // Too long
    "ABC-DEF-GHI", // Invalid characters
    "", // Empty string
    "123-45-6789", // Wrong format pattern
  ];

  for (const invalidTaxId of invalidTaxIds) {
    const invalidData = {
      ...sellerData,
      tax_id: invalidTaxId,
    } satisfies IShoppingMallSeller.IJoin;

    await TestValidator.error(
      `registration should reject tax ID: ${invalidTaxId}`,
      async () => {
        await api.functional.auth.seller.join(connection, {
          body: invalidData,
        });
      },
    );
  }

  // Verify successful registration with valid tax ID format
  const validSellerData = {
    ...sellerData,
    tax_id: "12-3456789", // Standard format
  } satisfies IShoppingMallSeller.IJoin;

  const registeredSeller = await api.functional.auth.seller.join(connection, {
    body: validSellerData,
  });

  typia.assert(registeredSeller);
  TestValidator.predicate(
    "valid tax ID registration should succeed",
    registeredSeller.tax_id === validSellerData.tax_id,
  );
}
