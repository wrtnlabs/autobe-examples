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
 * Test that an authenticated customer successfully updates their profile with both a new display name and phone number.
 *
 * Validates that the customer profile update endpoint correctly accepts and persists changes to display_name and phone_number. Ensures display_name is not empty, updates the stored record, refreshes updated_at timestamp, and returns the complete updated profile.
 *
 * 1. Register and authenticate a new customer.
 * 2. Update the customer's profile with a new display name and phone number.
 * 3. Validate returned profile matches the updated values.
 */
export async function test_api_customer_profile_update_display_and_phone(
  connection: api.IConnection,
) {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  typia.assert(authResponse);
  // 2. Prepare update request body with new display name and phone number
  const body = {
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
  } satisfies IEcommercePlatformCustomerProfile.IUpdate;
  // 3. Update profile
  const updatedProfile =
    await api.functional.ecommercePlatform.customer.profile.update(
      customerConnection,
      { body } satisfies {
        body: IEcommercePlatformCustomerProfile.IUpdate;
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate returned profile matches updated values
  TestValidator.equals(
    "display_name matches",
    updatedProfile.display_name,
    body.display_name,
  );
  TestValidator.equals(
    "phone_number matches",
    updatedProfile.phone_number,
    body.phone_number,
  );
  TestValidator.predicate(
    "display_name is not empty",
    updatedProfile.display_name.length > 0,
  );
  TestValidator.predicate(
    "customer reference is present",
    updatedProfile.customer !== undefined,
  );
  TestValidator.equals(
    "customer email matches",
    updatedProfile.customer.email,
    authResponse.email,
  );
}
