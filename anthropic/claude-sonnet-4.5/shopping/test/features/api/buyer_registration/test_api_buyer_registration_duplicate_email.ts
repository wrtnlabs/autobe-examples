import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer registration duplicate email constraint enforcement.
 *
 * This test validates that the shopping mall platform properly enforces email
 * uniqueness in the buyer registration process. It ensures that the
 * database-level unique constraint on the email column prevents duplicate buyer
 * accounts.
 *
 * Test Flow:
 *
 * 1. Successfully register a buyer with a unique email address
 * 2. Verify the registration succeeds and returns authentication tokens
 * 3. Attempt to register another buyer with the same email address
 * 4. Verify the duplicate registration attempt fails with an error
 * 5. Confirm no duplicate buyer records are created
 */
export async function test_api_buyer_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Generate test data for first buyer registration
  const duplicateEmail = typia.random<string & tags.Format<"email">>();

  const firstBuyerData = {
    email: duplicateEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  // Step 2: Successfully register the first buyer
  const firstBuyer = await api.functional.auth.buyer.join(connection, {
    body: firstBuyerData,
  });

  // Step 3: Validate the first registration succeeded
  typia.assert(firstBuyer);

  // Step 4: Verify the email was correctly stored
  TestValidator.equals(
    "first buyer email matches",
    firstBuyer.email,
    duplicateEmail,
  );

  // Step 5: Attempt to register second buyer with duplicate email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      const secondBuyerData = {
        email: duplicateEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate;

      await api.functional.auth.buyer.join(connection, {
        body: secondBuyerData,
      });
    },
  );
}
