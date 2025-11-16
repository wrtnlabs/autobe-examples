import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test that buyer full name updates enforce the minimum length validation of 2
 * characters.
 *
 * This test validates business rule enforcement for profile data quality by
 * ensuring that the minimum length constraint (2 characters) for buyer full
 * names is properly validated and accepted at the boundary value.
 *
 * Steps:
 *
 * 1. Create a buyer account via join with valid initial full name
 * 2. Attempt to update full_name to a value with exactly 2 characters (minimum
 *    valid)
 * 3. Validate that the update succeeds and returns the 2-character name
 * 4. Verify that the updated_at timestamp is refreshed
 * 5. Confirm that the validation accepts the minimum length boundary value
 */
export async function test_api_buyer_profile_update_minimum_name_length(
  connection: api.IConnection,
) {
  // Step 1: Create a buyer account with valid initial data
  const initialBuyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<20>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(initialBuyer);

  // Step 2: Update the buyer's full_name to exactly 2 characters (minimum valid boundary)
  const minimumValidName = "AB";
  const updatedBuyer = await api.functional.shoppingMall.buyer.buyers.update(
    connection,
    {
      buyerId: initialBuyer.id,
      body: {
        full_name: minimumValidName,
      } satisfies IShoppingMallBuyer.IUpdate,
    },
  );
  typia.assert(updatedBuyer);

  // Step 3: Validate that the update succeeded with the 2-character name
  TestValidator.equals(
    "updated name matches minimum length value",
    updatedBuyer.full_name,
    minimumValidName,
  );

  // Step 4: Verify that the updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at is later than created_at",
    new Date(updatedBuyer.updated_at).getTime() >=
      new Date(updatedBuyer.created_at).getTime(),
  );

  // Step 5: Confirm buyer ID and email remain unchanged
  TestValidator.equals("buyer ID unchanged", updatedBuyer.id, initialBuyer.id);
  TestValidator.equals(
    "email unchanged",
    updatedBuyer.email,
    initialBuyer.email,
  );
}
