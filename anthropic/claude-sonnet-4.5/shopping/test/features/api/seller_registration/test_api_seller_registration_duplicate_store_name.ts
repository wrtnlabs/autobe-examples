import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration duplicate store name validation.
 *
 * This test validates that the system properly rejects seller registration
 * attempts when a store name that already exists in the system is used. The
 * store_name field must be unique across all sellers to maintain distinct brand
 * identities in the marketplace.
 *
 * Test Steps:
 *
 * 1. Register first seller with a unique store name - should succeed
 * 2. Attempt to register second seller with same store name - should fail
 * 3. Verify the duplicate registration is properly rejected
 */
export async function test_api_seller_registration_duplicate_store_name(
  connection: api.IConnection,
) {
  // Generate a unique store name that will be used for both registration attempts
  const duplicateStoreName = RandomGenerator.name(2);

  // Step 1: Register the first seller with the store name - this should succeed
  const firstSellerEmail = typia.random<string & tags.Format<"email">>();
  const firstSellerData = {
    email: firstSellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    store_name: duplicateStoreName,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const firstSeller = await api.functional.auth.seller.join(connection, {
    body: firstSellerData,
  });
  typia.assert(firstSeller);

  // Verify first seller was created successfully with correct store name
  TestValidator.equals(
    "first seller store name matches",
    firstSeller.store_name,
    duplicateStoreName,
  );

  // Step 2: Attempt to register a second seller with the same store name but different email
  const secondSellerEmail = typia.random<string & tags.Format<"email">>();
  const secondSellerData = {
    email: secondSellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    store_name: duplicateStoreName,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  // Step 3: Verify that duplicate store name registration fails
  await TestValidator.error("duplicate store name should fail", async () => {
    await api.functional.auth.seller.join(connection, {
      body: secondSellerData,
    });
  });
}
