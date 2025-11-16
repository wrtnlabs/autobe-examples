import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration duplicate email validation.
 *
 * This test validates that the system properly enforces email uniqueness
 * constraint across all seller accounts. It verifies that attempting to
 * register a second seller account with an already-registered email address is
 * rejected by the system.
 *
 * Test workflow:
 *
 * 1. Generate unique test email address
 * 2. Register first seller account with complete business information
 * 3. Verify first registration succeeds with proper authentication tokens
 * 4. Attempt to register second seller with same email but different business data
 * 5. Verify second registration is rejected with error
 *
 * This ensures data integrity and prevents duplicate seller accounts with the
 * same email, which is critical for authentication and business operations.
 */
export async function test_api_seller_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate unique email for testing
  const duplicateEmail = typia.random<string & tags.Format<"email">>();

  // Generate current page URL and referrer URL for session tracking
  const currentPageUrl = "https://marketplace.example.com/seller/register";
  const referrerUrl = "https://marketplace.example.com/seller/info";

  // Step 1: Register first seller account successfully
  const firstSellerData = {
    email: duplicateEmail,
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 5,
    }),
    href: currentPageUrl,
    referrer: referrerUrl,
  } satisfies IShoppingMallSeller.ICreate;

  const firstSeller = await api.functional.auth.seller.join(connection, {
    body: firstSellerData,
  });
  typia.assert(firstSeller);

  // Validate first registration succeeded
  TestValidator.equals(
    "first seller email matches",
    firstSeller.email,
    duplicateEmail,
  );

  // Step 2: Attempt to register second seller with SAME email but DIFFERENT business data
  const secondSellerData = {
    email: duplicateEmail,
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 5,
    }),
    href: currentPageUrl,
    referrer: referrerUrl,
  } satisfies IShoppingMallSeller.ICreate;

  // Step 3: Verify duplicate email registration is rejected
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: secondSellerData,
      });
    },
  );
}
