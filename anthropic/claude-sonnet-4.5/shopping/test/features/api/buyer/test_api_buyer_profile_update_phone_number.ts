import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer phone number update functionality for delivery coordination.
 *
 * This test validates that buyers can successfully add or update their phone
 * number after registration. Phone numbers are optional during sign-up but
 * recommended for delivery coordination and SMS notifications.
 *
 * Steps:
 *
 * 1. Create a buyer account without a phone number
 * 2. Update the buyer profile to add a phone number with country code
 * 3. Validate the response contains the updated phone number
 * 4. Verify international format (country code included)
 * 5. Confirm updated_at timestamp has been modified
 * 6. Ensure other profile fields remain unchanged
 */
export async function test_api_buyer_profile_update_phone_number(
  connection: api.IConnection,
) {
  // Step 1: Create a buyer account without phone number
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(2),
    phone_number: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: registrationData,
    });
  typia.assert(buyer);

  // Validate initial state - no phone number
  TestValidator.equals(
    "initial phone number should be null",
    buyer.phone_number,
    null,
  );

  // Store original values for comparison
  const originalEmail = buyer.email;
  const originalFullName = buyer.full_name;
  const originalCreatedAt = buyer.created_at;
  const originalUpdatedAt = buyer.updated_at;

  // Step 2: Update buyer profile with phone number
  const newPhoneNumber = RandomGenerator.mobile("+82");

  const updateData = {
    phone_number: newPhoneNumber,
  } satisfies IShoppingMallBuyer.IUpdate;

  const updatedBuyer: IShoppingMallBuyer =
    await api.functional.shoppingMall.buyer.buyers.update(connection, {
      buyerId: buyer.id,
      body: updateData,
    });
  typia.assert(updatedBuyer);

  // Step 3: Validate the response contains the updated phone number
  TestValidator.equals(
    "phone number should be updated",
    updatedBuyer.phone_number,
    newPhoneNumber,
  );

  // Step 4: Verify international format with country code
  typia.assertGuard(updatedBuyer.phone_number!);
  TestValidator.predicate(
    "phone number should include country code",
    updatedBuyer.phone_number.startsWith("+"),
  );

  // Step 5: Confirm updated_at timestamp has been modified
  TestValidator.predicate(
    "updated_at should be after original updated_at",
    new Date(updatedBuyer.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  // Step 6: Ensure other fields remain unchanged
  TestValidator.equals(
    "email should remain unchanged",
    updatedBuyer.email,
    originalEmail,
  );
  TestValidator.equals(
    "full_name should remain unchanged",
    updatedBuyer.full_name,
    originalFullName,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedBuyer.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "buyer ID should remain unchanged",
    updatedBuyer.id,
    buyer.id,
  );
}
