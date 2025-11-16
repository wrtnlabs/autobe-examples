import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test multi-field buyer profile update with Partial<T> pattern.
 *
 * This test validates that a buyer can simultaneously update multiple profile
 * fields (full_name, email, phone_number) in a single API request,
 * demonstrating the flexibility of the Partial<T> update pattern.
 *
 * Steps:
 *
 * 1. Create buyer account with initial profile values
 * 2. Update full_name, email, and phone_number simultaneously
 * 3. Validate all updated fields reflect new values
 * 4. Verify updated_at timestamp changed
 * 5. Confirm created_at and system fields remain unchanged
 */
export async function test_api_buyer_profile_update_multiple_fields(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account with initial profile data
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialFullName = RandomGenerator.name();
  const initialPhoneNumber = RandomGenerator.mobile();

  const createBody = {
    email: initialEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: initialFullName,
    phone_number: initialPhoneNumber,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const authorizedBuyer = await api.functional.auth.buyer.join(connection, {
    body: createBody,
  });
  typia.assert(authorizedBuyer);

  // Verify initial values
  TestValidator.equals(
    "initial email matches",
    authorizedBuyer.email,
    initialEmail,
  );
  TestValidator.equals(
    "initial full_name matches",
    authorizedBuyer.full_name,
    initialFullName,
  );
  TestValidator.equals(
    "initial phone_number matches",
    authorizedBuyer.phone_number,
    initialPhoneNumber,
  );

  // Step 2: Update multiple fields simultaneously
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newFullName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();

  // Ensure new values differ from initial values
  TestValidator.notEquals(
    "new email differs from initial",
    newEmail,
    initialEmail,
  );
  TestValidator.notEquals(
    "new full_name differs from initial",
    newFullName,
    initialFullName,
  );
  TestValidator.notEquals(
    "new phone_number differs from initial",
    newPhoneNumber,
    initialPhoneNumber,
  );

  const updateBody = {
    email: newEmail,
    full_name: newFullName,
    phone_number: newPhoneNumber,
  } satisfies IShoppingMallBuyer.IUpdate;

  const updatedBuyer = await api.functional.shoppingMall.buyer.buyers.update(
    connection,
    {
      buyerId: authorizedBuyer.id,
      body: updateBody,
    },
  );
  typia.assert(updatedBuyer);

  // Step 3: Validate all updated fields contain new values
  TestValidator.equals("email updated correctly", updatedBuyer.email, newEmail);
  TestValidator.equals(
    "full_name updated correctly",
    updatedBuyer.full_name,
    newFullName,
  );
  TestValidator.equals(
    "phone_number updated correctly",
    updatedBuyer.phone_number,
    newPhoneNumber,
  );

  // Step 4: Verify updated_at timestamp reflects the modification
  TestValidator.predicate(
    "updated_at changed after update",
    new Date(updatedBuyer.updated_at).getTime() >
      new Date(authorizedBuyer.updated_at).getTime(),
  );

  // Step 5: Confirm system-managed fields remain unchanged
  TestValidator.equals(
    "buyer ID unchanged",
    updatedBuyer.id,
    authorizedBuyer.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedBuyer.created_at,
    authorizedBuyer.created_at,
  );
  TestValidator.equals(
    "email_verified unchanged",
    updatedBuyer.email_verified,
    authorizedBuyer.email_verified,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedBuyer.deleted_at,
    authorizedBuyer.deleted_at,
  );
}
