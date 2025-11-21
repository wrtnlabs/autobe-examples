import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration validation for invalid business type classification.
 *
 * This test validates that the seller registration endpoint properly rejects
 * invalid business type classifications that are not in the approved
 * marketplace categories. The marketplace only accepts specific business entity
 * types: sole proprietorship, corporation, limited liability company, or
 * partnership.
 *
 * The test will:
 *
 * 1. Generate valid seller registration data with proper email, business name,
 *    etc.
 * 2. Use an invalid business type string that doesn't match approved categories
 * 3. Verify that the API rejects the registration with appropriate validation
 * 4. Ensure the marketplace compliance requirements are maintained
 */
export async function test_api_seller_registration_invalid_business_type(
  connection: api.IConnection,
) {
  // Create valid seller registration data with invalid business type
  const invalidBusinessType = "invalid_business_type";

  // Use an invalid business type that doesn't match approved categories
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.name(),
    business_registration_number: RandomGenerator.alphaNumeric(12),
    tax_id: RandomGenerator.alphaNumeric(9),
    phone: RandomGenerator.mobile(),
    business_type: invalidBusinessType,
  } satisfies IShoppingMallSeller.IJoin;

  // Test that registration fails with invalid business type
  await TestValidator.error(
    "seller registration should fail with invalid business type",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: sellerData,
      });
    },
  );
}
