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
 * Test partial profile update by changing only the display name.
 *
 * Validates that the profile update endpoint correctly supports partial updates where only the display name is modified while the phone number remains unchanged. This ensures that omitted fields in the update request retain their existing database values rather than being cleared or modified.
 *
 * The test registers a customer, captures their initial profile state, sends a partial update with only a new display name, and verifies that the phone number field is preserved from before the update.
 *
 * 1. Register a new customer and capture initial profile state.
 * 2. Generate a new display name for the partial update.
 * 3. Send a partial profile update request with only the display_name field.
 * 4. Validate that display_name was updated and phone_number remained unchanged.
 */
export async function test_api_customer_profile_update_display_only(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Handle nullable customer_profile from join response
  const initialProfile = authorized.customer_profile!;
  typia.assertGuard(initialProfile);
  const initialPhoneNumber = initialProfile.phone_number;
  // 2. Generate a new display name
  const newDisplayName = RandomGenerator.name();
  // 3. Send partial profile update with only display_name
  const body = {
    display_name: newDisplayName,
  } satisfies IEcommercePlatformCustomerProfile.IUpdate;
  const updatedProfile =
    await api.functional.ecommercePlatform.customer.profile.update(
      customerConnection,
      { body },
    );
  typia.assert(updatedProfile);
  // 4. Validate results
  TestValidator.equals(
    "display_name updated to new value",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone_number unchanged after partial update",
    updatedProfile.phone_number,
    initialPhoneNumber,
  );
}
