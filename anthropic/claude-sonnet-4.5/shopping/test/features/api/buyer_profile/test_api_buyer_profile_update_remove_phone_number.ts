import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test that a buyer can remove their phone number from their profile by setting
 * it to null.
 *
 * This test validates the handling of nullable field removal in buyer profiles.
 * It ensures that optional contact information like phone numbers can be
 * removed while maintaining account validity and data integrity.
 *
 * Steps:
 *
 * 1. Create a buyer account via join with a phone number included
 * 2. Update the buyer profile setting phone_number to null
 * 3. Validate that the response shows phone_number as null
 * 4. Verify that the account remains valid without phone number
 * 5. Confirm that the updated_at timestamp reflects the change
 * 6. Ensure all required fields remain intact
 */
export async function test_api_buyer_profile_update_remove_phone_number(
  connection: api.IConnection,
) {
  // Step 1: Create a buyer account with phone number
  const initialPhoneNumber = RandomGenerator.mobile();
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyerName = RandomGenerator.name();

  const registrationData = {
    email: buyerEmail,
    password: buyerPassword,
    full_name: buyerName,
    phone_number: initialPhoneNumber,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const createdBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: registrationData,
    });
  typia.assert(createdBuyer);

  // Verify initial phone number is set (handle nullable type)
  if (
    createdBuyer.phone_number !== null &&
    createdBuyer.phone_number !== undefined
  ) {
    TestValidator.equals(
      "initial phone number matches",
      createdBuyer.phone_number,
      initialPhoneNumber,
    );
  }

  // Store the initial updated_at timestamp
  const initialUpdatedAt = createdBuyer.updated_at;

  // Step 2: Update the buyer profile to remove phone number
  const updateData = {
    phone_number: null,
  } satisfies IShoppingMallBuyer.IUpdate;

  const updatedBuyer: IShoppingMallBuyer =
    await api.functional.shoppingMall.buyer.buyers.update(connection, {
      buyerId: createdBuyer.id,
      body: updateData,
    });
  typia.assert(updatedBuyer);

  // Step 3: Validate that phone_number is now null
  TestValidator.equals(
    "phone number is null after removal",
    updatedBuyer.phone_number,
    null,
  );

  // Step 4: Verify account remains valid with all required fields intact
  TestValidator.equals("buyer ID unchanged", updatedBuyer.id, createdBuyer.id);

  TestValidator.equals(
    "email unchanged",
    updatedBuyer.email,
    createdBuyer.email,
  );

  TestValidator.equals(
    "full name unchanged",
    updatedBuyer.full_name,
    createdBuyer.full_name,
  );

  TestValidator.equals(
    "email verification status unchanged",
    updatedBuyer.email_verified,
    createdBuyer.email_verified,
  );

  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedBuyer.created_at,
    createdBuyer.created_at,
  );

  // Step 5: Confirm that updated_at timestamp has changed
  TestValidator.predicate(
    "updated_at timestamp has changed",
    updatedBuyer.updated_at !== initialUpdatedAt,
  );

  // Step 6: Verify account is active (deleted_at is null or undefined)
  TestValidator.predicate(
    "account is not deleted",
    updatedBuyer.deleted_at === null || updatedBuyer.deleted_at === undefined,
  );
}
