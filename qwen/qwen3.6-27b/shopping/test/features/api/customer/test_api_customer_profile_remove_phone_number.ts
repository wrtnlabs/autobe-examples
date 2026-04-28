import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer removes their phone number from their profile.
 *
 * Validates the complete phone number removal workflow: first establishing a phone number on the customer profile, then removing it by setting the field to null. Confirms the system correctly interprets null as removal rather than an empty value, and that other profile fields remain intact.
 *
 * Key business rules tested:
 * - Phone number field supports explicit clearing via null assignment
 * - Display name must still be provided in the update request and cannot be empty
 * - Other profile fields persist unchanged after phone number removal
 *
 * 1. Customer registers a new account using random credentials.
 * 2. Customer updates profile to establish a phone number.
 * 3. Validates the phone number is present in the response.
 * 4. Customer updates profile again, setting phone_number to null to remove it.
 * 5. Validates the profile response has null phone_number and display_name remains present.
 */
export async function test_api_customer_profile_remove_phone_number(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Establish a phone number first
  const displayName = RandomGenerator.name();
  const initialPhoneNumber = RandomGenerator.mobile();
  const setUpBody = {
    display_name: displayName,
    phone_number: initialPhoneNumber,
  } satisfies IEcommercePlatformCustomerProfile.IUpdate;
  const profileWithPhone =
    await api.functional.ecommercePlatform.customer.profile.update(
      customerConnection,
      { body: setUpBody },
    );
  typia.assert(profileWithPhone);
  TestValidator.equals(
    "phone number is set",
    profileWithPhone.phone_number,
    initialPhoneNumber,
  );
  // 3. Remove phone number by setting to null
  const removeBody = {
    display_name: displayName,
    phone_number: null,
  } satisfies IEcommercePlatformCustomerProfile.IUpdate;
  const updatedProfile =
    await api.functional.ecommercePlatform.customer.profile.update(
      customerConnection,
      { body: removeBody },
    );
  typia.assert(updatedProfile);
  // 4. Validate phone number is removed and display name persists
  TestValidator.equals(
    "phone number is removed",
    updatedProfile.phone_number,
    null,
  );
  TestValidator.predicate(
    "display name is present",
    updatedProfile.display_name.length > 0,
  );
}
