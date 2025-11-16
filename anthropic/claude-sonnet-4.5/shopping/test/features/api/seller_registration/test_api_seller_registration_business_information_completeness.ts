import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration with comprehensive business information validation.
 *
 * This test validates that the seller registration endpoint properly enforces
 * all business information field requirements including length constraints,
 * format validation, and data completeness. It ensures that valid business data
 * is accepted and properly stored in the system.
 *
 * Test Flow:
 *
 * 1. Register seller with minimum valid business_name (2 characters)
 * 2. Register seller with maximum valid business_name (200 characters)
 * 3. Register seller with maximum valid business_description (2000 characters)
 * 4. Register seller with minimum valid store_name (2 characters)
 * 5. Register seller with maximum valid store_name (100 characters)
 * 6. Register seller with minimum valid full_name (1 character)
 * 7. Register seller with maximum valid full_name (255 characters)
 * 8. Register seller with valid E.164 phone number formats
 * 9. Verify all business information is correctly returned in response
 */
export async function test_api_seller_registration_business_information_completeness(
  connection: api.IConnection,
) {
  // Test 1: Register with minimum valid business_name (2 characters)
  const minBusinessNameSeller = await api.functional.auth.seller.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: "+821012345678",
        business_name: RandomGenerator.alphabets(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        href: "https://marketplace.example.com/seller/register" satisfies string &
          tags.Format<"uri">,
        referrer:
          "https://marketplace.example.com/seller/info" satisfies string &
            tags.Format<"uri">,
      } satisfies IShoppingMallSeller.ICreate,
    },
  );
  typia.assert(minBusinessNameSeller);
  TestValidator.predicate(
    "minimum business_name length",
    minBusinessNameSeller.business_name.length >= 2,
  );

  // Test 2: Register with maximum valid business_name (200 characters)
  const maxBusinessNameSeller = await api.functional.auth.seller.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: "+14155551234",
        business_name: RandomGenerator.alphabets(200),
        business_description: RandomGenerator.paragraph({ sentences: 10 }),
        store_name: RandomGenerator.name(3),
        href: "https://marketplace.example.com/seller/register" satisfies string &
          tags.Format<"uri">,
        referrer:
          "https://marketplace.example.com/seller/info" satisfies string &
            tags.Format<"uri">,
      } satisfies IShoppingMallSeller.ICreate,
    },
  );
  typia.assert(maxBusinessNameSeller);
  TestValidator.predicate(
    "maximum business_name length",
    maxBusinessNameSeller.business_name.length <= 200,
  );

  // Test 3: Register with maximum valid business_description (2000 characters)
  const maxDescriptionContent = RandomGenerator.alphabets(2000);
  const maxDescriptionSeller = await api.functional.auth.seller.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: "+447911123456",
        business_name: RandomGenerator.name(4),
        business_description: maxDescriptionContent,
        store_name: RandomGenerator.name(2),
        href: "https://marketplace.example.com/seller/register" satisfies string &
          tags.Format<"uri">,
        referrer:
          "https://marketplace.example.com/seller/info" satisfies string &
            tags.Format<"uri">,
      } satisfies IShoppingMallSeller.ICreate,
    },
  );
  typia.assert(maxDescriptionSeller);
  TestValidator.predicate(
    "maximum business_description length",
    maxDescriptionSeller.business_description.length <= 2000,
  );

  // Test 4: Register with minimum valid store_name (2 characters)
  const minStoreNameSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: "+861234567890",
      business_name: RandomGenerator.name(5),
      business_description: RandomGenerator.paragraph({ sentences: 3 }),
      store_name: RandomGenerator.alphabets(2),
      href: "https://marketplace.example.com/seller/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://marketplace.example.com/seller/info" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(minStoreNameSeller);
  TestValidator.predicate(
    "minimum store_name length",
    minStoreNameSeller.store_name.length >= 2,
  );

  // Test 5: Register with maximum valid store_name (100 characters)
  const maxStoreNameSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: "+919876543210",
      business_name: RandomGenerator.name(6),
      business_description: RandomGenerator.paragraph({ sentences: 7 }),
      store_name: RandomGenerator.alphabets(100),
      href: "https://marketplace.example.com/seller/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://marketplace.example.com/seller/info" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(maxStoreNameSeller);
  TestValidator.predicate(
    "maximum store_name length",
    maxStoreNameSeller.store_name.length <= 100,
  );

  // Test 6: Register with minimum valid full_name (1 character)
  const minFullNameSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.alphabets(1),
      phone_number: "+33123456789",
      business_name: RandomGenerator.name(7),
      business_description: RandomGenerator.paragraph({ sentences: 4 }),
      store_name: RandomGenerator.name(5),
      href: "https://marketplace.example.com/seller/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://marketplace.example.com/seller/info" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(minFullNameSeller);
  TestValidator.predicate(
    "minimum full_name length",
    minFullNameSeller.full_name.length >= 1,
  );

  // Test 7: Register with maximum valid full_name (255 characters)
  const maxFullNameSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.alphabets(255),
      phone_number: "+491234567890",
      business_name: RandomGenerator.name(8),
      business_description: RandomGenerator.paragraph({ sentences: 6 }),
      store_name: RandomGenerator.name(6),
      href: "https://marketplace.example.com/seller/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://marketplace.example.com/seller/info" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(maxFullNameSeller);
  TestValidator.predicate(
    "maximum full_name length",
    maxFullNameSeller.full_name.length <= 255,
  );

  // Test 8: Register with various valid E.164 phone number formats
  const phoneFormats = [
    "+821012345678",
    "+14155551234",
    "+447911123456",
    "+861234567890",
    "+919876543210",
  ] as const;

  const selectedPhone = RandomGenerator.pick(phoneFormats);
  const phoneValidationSeller = await api.functional.auth.seller.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: selectedPhone,
        business_name: RandomGenerator.name(10),
        business_description: RandomGenerator.paragraph({ sentences: 8 }),
        store_name: RandomGenerator.name(7),
        href: "https://marketplace.example.com/seller/register" satisfies string &
          tags.Format<"uri">,
        referrer:
          "https://marketplace.example.com/seller/info" satisfies string &
            tags.Format<"uri">,
      } satisfies IShoppingMallSeller.ICreate,
    },
  );
  typia.assert(phoneValidationSeller);
  TestValidator.equals(
    "phone number format validation",
    phoneValidationSeller.phone_number,
    selectedPhone,
  );

  // Test 9: Comprehensive registration with all fields properly validated
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = typia.random<string & tags.MinLength<8>>();
  const testFullName = RandomGenerator.name();
  const testPhoneNumber = "+821098765432";
  const testBusinessName = RandomGenerator.name(15);
  const testBusinessDescription = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
  });
  const testStoreName = RandomGenerator.name(8);

  const completeSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: testEmail,
      password: testPassword,
      full_name: testFullName,
      phone_number: testPhoneNumber,
      business_name: testBusinessName,
      business_description: testBusinessDescription,
      store_name: testStoreName,
      href: "https://marketplace.example.com/seller/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://marketplace.example.com/seller/info" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ICreate,
  });

  typia.assert(completeSeller);

  // Validate response data integrity - business logic only
  TestValidator.equals("email matches", completeSeller.email, testEmail);
  TestValidator.equals(
    "full_name matches",
    completeSeller.full_name,
    testFullName,
  );
  TestValidator.equals(
    "phone_number matches",
    completeSeller.phone_number,
    testPhoneNumber,
  );
  TestValidator.equals(
    "business_name matches",
    completeSeller.business_name,
    testBusinessName,
  );
  TestValidator.equals(
    "business_description matches",
    completeSeller.business_description,
    testBusinessDescription,
  );
  TestValidator.equals(
    "store_name matches",
    completeSeller.store_name,
    testStoreName,
  );
}
