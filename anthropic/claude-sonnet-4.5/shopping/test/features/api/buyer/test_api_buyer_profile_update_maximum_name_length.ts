import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test that buyer full name updates enforce the maximum length validation of
 * 100 characters.
 *
 * This test validates upper boundary constraints for profile data by creating a
 * buyer account and attempting to update the full_name to exactly 100
 * characters (the maximum allowed length). It verifies that the update
 * succeeds, the full name is stored without truncation, and the updated_at
 * timestamp reflects the change.
 *
 * Steps:
 *
 * 1. Create a buyer account via join with valid initial full name
 * 2. Generate a full_name string with exactly 100 characters (maximum valid)
 * 3. Update the buyer profile with the 100-character name
 * 4. Validate that the update succeeds and stores the full 100-character name
 * 5. Verify that the response contains the complete name without truncation
 * 6. Confirm that the updated_at timestamp reflects the change
 */
export async function test_api_buyer_profile_update_maximum_name_length(
  connection: api.IConnection,
) {
  // Step 1: Create a buyer account with valid initial full name
  const initialFullName = RandomGenerator.name();
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();

  const createdBuyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: initialFullName,
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(createdBuyer);

  // Store the original updated_at timestamp for comparison
  const originalUpdatedAt = createdBuyer.updated_at;

  // Step 2: Generate a full_name string with exactly 100 characters (maximum allowed)
  const maxLengthName = RandomGenerator.alphabets(100);
  TestValidator.equals(
    "generated name length should be exactly 100 characters",
    maxLengthName.length,
    100,
  );

  // Step 3: Update the buyer profile with the 100-character name
  const updatedBuyer = await api.functional.shoppingMall.buyer.buyers.update(
    connection,
    {
      buyerId: createdBuyer.id,
      body: {
        full_name: maxLengthName,
      } satisfies IShoppingMallBuyer.IUpdate,
    },
  );
  typia.assert(updatedBuyer);

  // Step 4: Validate that the update succeeded and stored the full 100-character name
  TestValidator.equals(
    "updated full_name should match the 100-character input",
    updatedBuyer.full_name,
    maxLengthName,
  );

  // Step 5: Verify that the response contains the complete name without truncation
  TestValidator.equals(
    "updated full_name length should be exactly 100 characters",
    updatedBuyer.full_name.length,
    100,
  );

  // Step 6: Confirm that the updated_at timestamp has changed to reflect the modification
  TestValidator.predicate(
    "updated_at timestamp should be different from original",
    updatedBuyer.updated_at !== originalUpdatedAt,
  );

  // Additional validation: Verify other buyer properties remain unchanged
  TestValidator.equals(
    "buyer ID should remain unchanged",
    updatedBuyer.id,
    createdBuyer.id,
  );

  TestValidator.equals(
    "buyer email should remain unchanged",
    updatedBuyer.email,
    createdBuyer.email,
  );
}
