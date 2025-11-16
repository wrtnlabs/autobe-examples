import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer profile retrieval with optional phone number handling.
 *
 * This test validates that the buyer profile API correctly handles the optional
 * phone_number field in both scenarios: when a phone number is provided during
 * registration and when it is omitted (null). The test ensures that profile
 * retrieval works correctly regardless of phone number presence and that all
 * other profile fields remain consistent.
 *
 * Test Flow:
 *
 * 1. Create first buyer account WITH phone number
 * 2. Authenticate and retrieve profile for buyer with phone
 * 3. Validate phone_number field contains the provided value
 * 4. Create second buyer account WITHOUT phone number (null)
 * 5. Authenticate and retrieve profile for buyer without phone
 * 6. Validate phone_number field is null
 * 7. Verify response structure consistency across both scenarios
 */
export async function test_api_buyer_profile_with_optional_phone(
  connection: api.IConnection,
) {
  // Create first buyer WITH phone number
  const buyerWithPhoneEmail = typia.random<string & tags.Format<"email">>();
  const buyerWithPhoneNumber = RandomGenerator.mobile();
  const buyerWithPhoneData = {
    email: buyerWithPhoneEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: buyerWithPhoneNumber,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyerWithPhone = await api.functional.auth.buyer.join(connection, {
    body: buyerWithPhoneData,
  });
  typia.assert(buyerWithPhone);

  // Retrieve profile for buyer with phone number
  const profileWithPhone = await api.functional.shoppingMall.buyer.buyers.at(
    connection,
    {
      buyerId: buyerWithPhone.id,
    },
  );
  typia.assert(profileWithPhone);

  // Validate buyer with phone number
  TestValidator.equals(
    "buyer with phone - ID matches",
    profileWithPhone.id,
    buyerWithPhone.id,
  );
  TestValidator.equals(
    "buyer with phone - email matches",
    profileWithPhone.email,
    buyerWithPhoneEmail,
  );
  TestValidator.equals(
    "buyer with phone - phone_number matches",
    profileWithPhone.phone_number,
    buyerWithPhoneNumber,
  );
  TestValidator.predicate(
    "buyer with phone - phone_number is not null",
    profileWithPhone.phone_number !== null &&
      profileWithPhone.phone_number !== undefined,
  );

  // Create second buyer WITHOUT phone number (null)
  const buyerWithoutPhoneEmail = typia.random<string & tags.Format<"email">>();
  const buyerWithoutPhoneData = {
    email: buyerWithoutPhoneEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyerWithoutPhone = await api.functional.auth.buyer.join(connection, {
    body: buyerWithoutPhoneData,
  });
  typia.assert(buyerWithoutPhone);

  // Retrieve profile for buyer without phone number
  const profileWithoutPhone = await api.functional.shoppingMall.buyer.buyers.at(
    connection,
    {
      buyerId: buyerWithoutPhone.id,
    },
  );
  typia.assert(profileWithoutPhone);

  // Validate buyer without phone number
  TestValidator.equals(
    "buyer without phone - ID matches",
    profileWithoutPhone.id,
    buyerWithoutPhone.id,
  );
  TestValidator.equals(
    "buyer without phone - email matches",
    profileWithoutPhone.email,
    buyerWithoutPhoneEmail,
  );
  TestValidator.equals(
    "buyer without phone - phone_number is null",
    profileWithoutPhone.phone_number,
    null,
  );

  // Verify both profiles have consistent structure for other required fields
  TestValidator.predicate(
    "buyer with phone - has full_name",
    profileWithPhone.full_name.length > 0,
  );
  TestValidator.predicate(
    "buyer without phone - has full_name",
    profileWithoutPhone.full_name.length > 0,
  );
}
