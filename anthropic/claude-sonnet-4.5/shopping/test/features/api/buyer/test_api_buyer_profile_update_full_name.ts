import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test that a buyer can successfully update their full name in their profile.
 *
 * This validates the self-service profile management capability for name
 * changes. Buyers need to maintain accurate personal information for order
 * fulfillment and shipping coordination. This test ensures the full_name update
 * workflow works correctly with proper validation and timestamp management.
 *
 * Steps:
 *
 * 1. Create a new buyer account via join with initial full name
 * 2. Use the buyer authentication to update the full_name field to a new value
 * 3. Validate that the response returns the updated buyer account with the new
 *    full_name
 * 4. Verify that the updated_at timestamp has been refreshed to reflect the
 *    modification
 * 5. Confirm that other fields like email, phone_number, and created_at remain
 *    unchanged
 * 6. Ensure the new full_name meets validation requirements (minimum 2 characters,
 *    maximum 100 characters)
 */
export async function test_api_buyer_profile_update_full_name(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account with initial full_name
  const initialFullName = RandomGenerator.name();
  const newFullName = RandomGenerator.name();

  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: initialFullName,
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const authorizedBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, { body: joinBody });
  typia.assert(authorizedBuyer);

  // Verify initial state
  TestValidator.equals(
    "initial full_name matches",
    authorizedBuyer.full_name,
    initialFullName,
  );
  TestValidator.equals(
    "email matches registration",
    authorizedBuyer.email,
    joinBody.email,
  );

  // Step 2: Update the buyer's full_name using the authenticated session
  const updateBody = {
    full_name: newFullName,
  } satisfies IShoppingMallBuyer.IUpdate;

  const updatedBuyer: IShoppingMallBuyer =
    await api.functional.shoppingMall.buyer.buyers.update(connection, {
      buyerId: authorizedBuyer.id,
      body: updateBody,
    });
  typia.assert(updatedBuyer);

  // Step 3: Validate the updated buyer account
  TestValidator.equals(
    "full_name updated successfully",
    updatedBuyer.full_name,
    newFullName,
  );

  // Step 4: Verify updated_at timestamp has been refreshed
  const originalUpdatedAt = new Date(authorizedBuyer.updated_at);
  const newUpdatedAt = new Date(updatedBuyer.updated_at);
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    newUpdatedAt >= originalUpdatedAt,
  );

  // Step 5: Confirm other fields remain unchanged
  TestValidator.equals(
    "buyer ID unchanged",
    updatedBuyer.id,
    authorizedBuyer.id,
  );
  TestValidator.equals(
    "email unchanged",
    updatedBuyer.email,
    authorizedBuyer.email,
  );
  TestValidator.equals(
    "phone_number unchanged",
    updatedBuyer.phone_number,
    authorizedBuyer.phone_number,
  );
  TestValidator.equals(
    "email_verified unchanged",
    updatedBuyer.email_verified,
    authorizedBuyer.email_verified,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedBuyer.created_at,
    authorizedBuyer.created_at,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedBuyer.deleted_at,
    authorizedBuyer.deleted_at,
  );
}
