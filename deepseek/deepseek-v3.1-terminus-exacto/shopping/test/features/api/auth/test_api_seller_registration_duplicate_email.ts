import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration failure when using an email address already
 * registered by another seller. Validates that email uniqueness constraints are
 * properly enforced and appropriate error responses are returned for duplicate
 * registration attempts.
 */
export async function test_api_seller_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate a unique email address for the first seller
  const duplicateEmail = typia.random<string & tags.Format<"email">>();

  // Create realistic business data for the first seller
  const firstSellerData = {
    email: duplicateEmail,
    password: "SecurePassword123!",
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_person: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: undefined,
    ip: undefined,
    href: "https://shopping-mall.example.com/seller/join",
    referrer: "https://shopping-mall.example.com/",
  } satisfies IShoppingMallSeller.ICreate;

  // Register the first seller successfully
  const firstSeller = await api.functional.auth.seller.join(connection, {
    body: firstSellerData,
  });
  typia.assert(firstSeller);

  // Verify the first seller was created with the correct email
  TestValidator.equals(
    "first seller email matches registration email",
    firstSeller.email,
    duplicateEmail,
  );

  // Create data for the second seller attempt with the same email
  const secondSellerData = {
    email: duplicateEmail,
    password: "AnotherPassword456!",
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_person: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: undefined,
    ip: undefined,
    href: "https://shopping-mall.example.com/seller/join",
    referrer: "https://shopping-mall.example.com/",
  } satisfies IShoppingMallSeller.ICreate;

  // Attempt to register second seller with duplicate email - should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: secondSellerData,
      });
    },
  );
}
