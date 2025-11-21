import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration rejection with invalid business registration number
 * format.
 *
 * This test validates that the seller registration endpoint properly rejects
 * invalid business registration numbers. Business registration numbers are
 * critical for marketplace trust and compliance requirements.
 *
 * Test cases include:
 *
 * 1. Business registration number with invalid characters
 * 2. Business registration number with incorrect length
 * 3. Business registration number with improper formatting
 * 4. Empty or missing business registration number
 *
 * The system should provide clear error messages indicating the valid format
 * requirements for business registration numbers.
 */
export async function test_api_seller_registration_invalid_business_registration(
  connection: api.IConnection,
) {
  // Test case 1: Business registration number with invalid special characters
  await TestValidator.error(
    "business registration with invalid special characters should fail",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          business_name: RandomGenerator.name(),
          business_registration_number: "12345678@#$%", // Invalid characters
          tax_id: RandomGenerator.alphaNumeric(9),
          phone: RandomGenerator.mobile(),
          business_type: RandomGenerator.pick([
            "corporation",
            "llc",
            "sole_proprietorship",
            "partnership",
          ]),
        } satisfies IShoppingMallSeller.IJoin,
      });
    },
  );

  // Test case 2: Business registration number that's too short
  await TestValidator.error(
    "business registration with too short number should fail",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          business_name: RandomGenerator.name(),
          business_registration_number: "123456", // Too short
          tax_id: RandomGenerator.alphaNumeric(9),
          phone: RandomGenerator.mobile(),
          business_type: RandomGenerator.pick([
            "corporation",
            "llc",
            "sole_proprietorship",
            "partnership",
          ]),
        } satisfies IShoppingMallSeller.IJoin,
      });
    },
  );

  // Test case 3: Business registration number that's too long
  await TestValidator.error(
    "business registration with too long number should fail",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          business_name: RandomGenerator.name(),
          business_registration_number: "123456789012345678901234567890", // Too long
          tax_id: RandomGenerator.alphaNumeric(9),
          phone: RandomGenerator.mobile(),
          business_type: RandomGenerator.pick([
            "corporation",
            "llc",
            "sole_proprietorship",
            "partnership",
          ]),
        } satisfies IShoppingMallSeller.IJoin,
      });
    },
  );

  // Test case 4: Empty business registration number
  await TestValidator.error(
    "business registration with empty number should fail",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          business_name: RandomGenerator.name(),
          business_registration_number: "", // Empty
          tax_id: RandomGenerator.alphaNumeric(9),
          phone: RandomGenerator.mobile(),
          business_type: RandomGenerator.pick([
            "corporation",
            "llc",
            "sole_proprietorship",
            "partnership",
          ]),
        } satisfies IShoppingMallSeller.IJoin,
      });
    },
  );

  // Test case 5: Business registration number with spaces only
  await TestValidator.error(
    "business registration with spaces only should fail",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          business_name: RandomGenerator.name(),
          business_registration_number: "   ", // Only spaces
          tax_id: RandomGenerator.alphaNumeric(9),
          phone: RandomGenerator.mobile(),
          business_type: RandomGenerator.pick([
            "corporation",
            "llc",
            "sole_proprietorship",
            "partnership",
          ]),
        } satisfies IShoppingMallSeller.IJoin,
      });
    },
  );

  // Test successful registration with valid business registration number
  const validRegistration = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(10), // Valid format
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "corporation",
        "llc",
        "sole_proprietorship",
        "partnership",
      ]),
    } satisfies IShoppingMallSeller.IJoin,
  });

  typia.assert(validRegistration);

  TestValidator.equals(
    "successful registration should have valid ID format",
    typeof validRegistration.id,
    "string",
  );

  TestValidator.equals(
    "successful registration should be verified",
    validRegistration.is_verified,
    true,
  );
}
