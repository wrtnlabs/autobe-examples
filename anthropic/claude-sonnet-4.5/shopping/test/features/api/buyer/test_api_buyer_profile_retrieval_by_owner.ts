import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer's ability to retrieve their own account profile information.
 *
 * This test validates the buyer profile retrieval endpoint by creating a buyer
 * account through registration and then fetching the complete buyer profile
 * using the buyer ID. It ensures that authenticated buyers can access their own
 * account details and that the response contains all expected fields without
 * exposing sensitive authentication data.
 *
 * Test workflow:
 *
 * 1. Generate realistic buyer registration data
 * 2. Register new buyer account (receives authentication automatically)
 * 3. Extract buyer ID from registration response
 * 4. Retrieve buyer profile using the buyer ID
 * 5. Validate profile data matches original registration information
 */
export async function test_api_buyer_profile_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Generate realistic buyer registration data
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationFullName = RandomGenerator.name();
  const registrationPhone = RandomGenerator.mobile();
  const registrationPassword = typia.random<string & tags.MinLength<8>>();

  const registrationData = {
    email: registrationEmail,
    password: registrationPassword,
    full_name: registrationFullName,
    phone_number: registrationPhone,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  // Step 2: Register new buyer account
  const registeredBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredBuyer);

  // Step 3: Retrieve buyer profile using buyer ID
  const retrievedProfile: IShoppingMallBuyer =
    await api.functional.shoppingMall.buyer.buyers.at(connection, {
      buyerId: registeredBuyer.id,
    });
  typia.assert(retrievedProfile);

  // Step 4: Validate profile data matches registration information
  TestValidator.equals(
    "retrieved profile ID matches registered buyer ID",
    retrievedProfile.id,
    registeredBuyer.id,
  );

  TestValidator.equals(
    "retrieved email matches registration email",
    retrievedProfile.email,
    registrationEmail,
  );

  TestValidator.equals(
    "retrieved full name matches registration full name",
    retrievedProfile.full_name,
    registrationFullName,
  );

  TestValidator.equals(
    "retrieved phone number matches registration phone number",
    retrievedProfile.phone_number,
    registrationPhone,
  );

  // Step 5: Verify account timestamps are consistent
  TestValidator.equals(
    "profile created_at matches registered buyer created_at",
    retrievedProfile.created_at,
    registeredBuyer.created_at,
  );

  TestValidator.equals(
    "profile updated_at matches registered buyer updated_at",
    retrievedProfile.updated_at,
    registeredBuyer.updated_at,
  );
}
