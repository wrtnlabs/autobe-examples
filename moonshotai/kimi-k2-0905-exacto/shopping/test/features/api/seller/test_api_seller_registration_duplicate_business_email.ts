import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration with duplicate business email prevention.
 *
 * Validates that the marketplace system prevents duplicate business email
 * addresses across seller accounts to maintain business identity integrity and
 * prevent registration conflicts. Tests the system's ability to detect and
 * reject duplicate business email registration attempts.
 *
 * 1. Create initial seller account with unique business email
 * 2. Attempt to create second seller with same business email
 * 3. Validate system rejects duplicate email registration
 * 4. Confirm error handling prevents duplicate business emails
 */
export async function test_api_seller_registration_duplicate_business_email(
  connection: api.IConnection,
) {
  // Generate unique business email for first seller
  const businessEmail = typia.random<string & tags.Format<"email">>();

  // Create first seller account successfully
  const firstSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: businessEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(firstSeller);

  // Verify first seller was created successfully
  TestValidator.predicate(
    "first seller created successfully",
    firstSeller.id !== undefined,
  );
  TestValidator.equals(
    "first seller email matches",
    firstSeller.email,
    businessEmail,
  );

  // Attempt to create second seller with same business email - should fail
  await TestValidator.error(
    "duplicate business email should be rejected",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: {
          email: businessEmail, // Same email as first seller
          business_name: RandomGenerator.name(),
          business_registration_number: RandomGenerator.alphaNumeric(12),
          tax_id: RandomGenerator.alphaNumeric(9),
          phone: RandomGenerator.mobile(),
          business_type: "llc",
        } satisfies IShoppingMallSeller.IJoin,
      });
    },
  );
}
