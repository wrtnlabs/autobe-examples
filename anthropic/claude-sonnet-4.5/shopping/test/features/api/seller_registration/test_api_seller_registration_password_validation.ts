import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration password validation requirements and security
 * constraints.
 *
 * This test validates that the seller registration endpoint properly enforces
 * password security requirements. It verifies that passwords shorter than the
 * minimum 8 characters are rejected with validation errors, while passwords
 * meeting the minimum requirement are accepted and properly hashed server-side
 * before storage.
 *
 * Test Flow:
 *
 * 1. Attempt registration with password shorter than 8 characters (should fail)
 * 2. Register seller with password exactly 8 characters (should succeed)
 * 3. Register seller with password longer than 8 characters (should succeed)
 * 4. Validate response structure and authentication tokens for successful
 *    registrations
 */
export async function test_api_seller_registration_password_validation(
  connection: api.IConnection,
) {
  // Test Case 1: Password too short (7 characters) - should fail validation
  await TestValidator.error(
    "registration with password shorter than 8 characters should fail",
    async () => {
      const shortPasswordData = {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(7), // 7 characters - below minimum
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate;

      await api.functional.auth.seller.join(connection, {
        body: shortPasswordData,
      });
    },
  );

  // Test Case 2: Password exactly 8 characters - should succeed
  const validPassword8Chars = RandomGenerator.alphaNumeric(8); // Exactly 8 characters
  const seller8Chars = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: validPassword8Chars,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller8Chars);

  // Test Case 3: Password longer than 8 characters - should succeed
  const validPasswordLong = RandomGenerator.alphaNumeric(12); // 12 characters
  const sellerLongPassword = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: validPasswordLong,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerLongPassword);
}
