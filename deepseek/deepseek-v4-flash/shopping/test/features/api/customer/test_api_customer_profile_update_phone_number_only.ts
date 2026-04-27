import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_phone_number_only(
  connection: api.IConnection,
): Promise<void> {
  // Create a customer-specific connection for isolated authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Register a new customer account
  // This creates a profile with empty display_name and null phone_number defaults
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Capture the original profile for comparison
  const originalProfile = authorized.profile;
  // Update only the phone number, omitting displayName from the request body
  const phoneNumber = RandomGenerator.mobile();
  const updatedProfile =
    await api.functional.eCommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          phoneNumber,
        } satisfies IECommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Verify the phone number was updated to the new value
  TestValidator.equals(
    "phone number updated to new value",
    updatedProfile.phone_number,
    phoneNumber,
  );
  // Verify the display name retained its original value (empty string from registration)
  TestValidator.equals(
    "display name unchanged after partial update",
    updatedProfile.display_name,
    originalProfile.display_name,
  );
}
