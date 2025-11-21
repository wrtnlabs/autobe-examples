import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration validation for business information requirements.
 * Validates that the system properly handles registration attempts with various
 * business validation scenarios, focusing on realistic business logic errors
 * rather than type system violations.
 */
export async function test_api_seller_registration_missing_required_fields(
  connection: api.IConnection,
) {
  // Create base valid seller registration data
  const validSellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_person: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    href: "https://example.com/seller/registration" satisfies string &
      tags.Format<"uri"> as string & tags.Format<"uri">,
    referrer: "https://example.com/seller/signup" satisfies string &
      tags.Format<"uri"> as string & tags.Format<"uri">,
  } satisfies IShoppingMallSeller.ICreate;

  // Test 1: Valid registration with all required fields (should succeed)
  const validRegistration = await api.functional.auth.seller.join(connection, {
    body: validSellerData,
  });
  typia.assert(validRegistration);

  // Verify successful registration contains expected fields
  TestValidator.equals(
    "registered seller should have valid ID",
    typeof validRegistration.id,
    "string",
  );
  TestValidator.equals(
    "registered seller email should match input",
    validRegistration.email,
    validSellerData.email,
  );
  TestValidator.equals(
    "registered seller business name should match input",
    validRegistration.business_name,
    validSellerData.business_name,
  );
  TestValidator.equals(
    "registered seller should have authorization token",
    typeof validRegistration.token.access,
    "string",
  );

  // Test 2: Duplicate email registration (business logic error)
  await TestValidator.error(
    "should reject duplicate email registration",
    async () => {
      const duplicateData = {
        ...validSellerData,
        email: validSellerData.email, // Same email as already registered seller
        business_name: RandomGenerator.paragraph({ sentences: 2 }), // Different business name
      } satisfies IShoppingMallSeller.ICreate;

      await api.functional.auth.seller.join(connection, {
        body: duplicateData,
      });
    },
  );

  // Test 3: Invalid email format (business validation error)
  await TestValidator.error("should reject invalid email format", async () => {
    const invalidEmailData = {
      ...validSellerData,
      email: "invalid-email-format" satisfies string as string, // Invalid email format
    } satisfies IShoppingMallSeller.ICreate;

    await api.functional.auth.seller.join(connection, {
      body: invalidEmailData,
    });
  });

  // Test 4: Duplicate business name registration (business logic error)
  await TestValidator.error(
    "should reject duplicate business name registration",
    async () => {
      const duplicateBusinessData = {
        ...validSellerData,
        email: typia.random<string & tags.Format<"email">>(), // Different email
        business_name: validSellerData.business_name, // Same business name
      } satisfies IShoppingMallSeller.ICreate;

      await api.functional.auth.seller.join(connection, {
        body: duplicateBusinessData,
      });
    },
  );

  // Test 5: Invalid URI format for href (business validation error)
  await TestValidator.error(
    "should reject invalid URI format for href",
    async () => {
      const invalidHrefData = {
        ...validSellerData,
        href: "not-a-valid-uri" satisfies string as string, // Invalid URI format
      } satisfies IShoppingMallSeller.ICreate;

      await api.functional.auth.seller.join(connection, {
        body: invalidHrefData,
      });
    },
  );

  // Test 6: Test with optional tax_id field provided
  const registrationWithTaxId = await api.functional.auth.seller.join(
    connection,
    {
      body: {
        ...validSellerData,
        email: typia.random<string & tags.Format<"email">>(), // New unique email
        tax_id: "123-45-6789", // Optional field provided
      } satisfies IShoppingMallSeller.ICreate,
    },
  );
  typia.assert(registrationWithTaxId);

  TestValidator.equals(
    "registration with tax_id should succeed",
    typeof registrationWithTaxId.id,
    "string",
  );
}
