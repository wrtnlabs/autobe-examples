import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test that buyer profile correctly displays email verification status.
 *
 * Create a new buyer account (which starts with email_verified: false by
 * default). Retrieve the profile immediately after registration to confirm that
 * email_verified is false. Validate that this field is properly exposed in the
 * profile response and reflects the buyer's verification state, which affects
 * their ability to place orders and access certain platform features.
 *
 * Steps:
 *
 * 1. Create a new buyer account with random registration data
 * 2. Verify the registration was successful and returns buyer information
 * 3. Retrieve the buyer profile using the buyer ID
 * 4. Validate that email_verified field is present and set to false
 * 5. Confirm all profile data matches the registration data
 */
export async function test_api_buyer_profile_email_verification_status(
  connection: api.IConnection,
) {
  // Step 1: Create buyer registration data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  // Step 2: Register the new buyer account
  const registeredBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredBuyer);

  // Step 3: Validate registration response has expected structure
  TestValidator.equals(
    "registered buyer email matches input",
    registeredBuyer.email,
    registrationData.email,
  );
  TestValidator.equals(
    "registered buyer full_name matches input",
    registeredBuyer.full_name,
    registrationData.full_name,
  );
  TestValidator.equals(
    "registered buyer phone_number matches input",
    registeredBuyer.phone_number,
    registrationData.phone_number,
  );

  // Step 4: Verify initial email_verified status is false
  TestValidator.equals(
    "newly registered buyer email_verified is false",
    registeredBuyer.email_verified,
    false,
  );

  // Step 5: Retrieve the buyer profile using the buyer ID
  const buyerProfile: IShoppingMallBuyer =
    await api.functional.shoppingMall.buyer.buyers.at(connection, {
      buyerId: registeredBuyer.id,
    });
  typia.assert(buyerProfile);

  // Step 6: Validate profile response matches registered buyer data
  TestValidator.equals(
    "profile buyer ID matches registered buyer ID",
    buyerProfile.id,
    registeredBuyer.id,
  );
  TestValidator.equals(
    "profile email matches registered email",
    buyerProfile.email,
    registeredBuyer.email,
  );
  TestValidator.equals(
    "profile full_name matches registered full_name",
    buyerProfile.full_name,
    registeredBuyer.full_name,
  );
  TestValidator.equals(
    "profile phone_number matches registered phone_number",
    buyerProfile.phone_number,
    registeredBuyer.phone_number,
  );

  // Step 7: Critical validation - email_verified field is present and false in profile
  TestValidator.equals(
    "profile email_verified field is false for new account",
    buyerProfile.email_verified,
    false,
  );

  // Step 8: Validate timestamps are present
  typia.assert<string & tags.Format<"date-time">>(buyerProfile.created_at);
  typia.assert<string & tags.Format<"date-time">>(buyerProfile.updated_at);
}
