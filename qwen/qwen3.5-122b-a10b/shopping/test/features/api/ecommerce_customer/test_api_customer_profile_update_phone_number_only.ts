import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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
 * Test customer profile update with phone number modification only.
 *
 * Validates partial update capability where customer updates only their phone_number field while leaving display_name unchanged. This ensures the profile update endpoint correctly handles partial updates and maintains audit trails through timestamp tracking.
 *
 * The test verifies that when only phone_number is provided in the update request:
 * 1. The phone_number field is successfully updated to the new value
 * 2. The display_name remains at its original value (not cleared or modified)
 * 3. The updated_at timestamp is refreshed to reflect the modification
 * 4. All other immutable fields (id, created_at, deleted_at) remain unchanged
 *
 * 1. Register customer with initial display_name and phone_number via authorize_customer_join
 * 2. Capture initial profile state including updated_at timestamp
 * 3. Wait briefly (100ms) to ensure timestamp difference is detectable
 * 4. Update only phone_number field using profile update endpoint (display_name omitted)
 * 5. Validate phone_number changed to new value
 * 6. Validate display_name remains at original value
 * 7. Validate updated_at timestamp is newer than original
 * 8. Validate id and created_at remain unchanged
 */
export async function test_api_customer_profile_update_phone_number_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer with initial profile data
  const customerConnection: api.IConnection = { host: connection.host };
  const initialDisplayName = RandomGenerator.name();
  const initialPhoneNumber = RandomGenerator.mobile();
  const initialEmail = `${RandomGenerator.name()}@example.com`;
  const initialPassword = `Password${randint(1000, 9999)}`;
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      display_name: initialDisplayName,
      phone_number: initialPhoneNumber,
      email: initialEmail,
      password: initialPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(authorized);
  // Capture initial profile state
  const initialProfile: IEcommerceCustomer = {
    id: authorized.id,
    display_name: authorized.display_name,
    phone_number: authorized.phone_number,
    created_at: authorized.created_at,
    updated_at: authorized.updated_at,
    deleted_at: authorized.deleted_at,
  };
  // 2. Wait briefly to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Generate new phone number for update
  const newPhoneNumber = RandomGenerator.mobile();
  // 4. Update only phone_number (display_name omitted)
  const updatedProfile = await api.functional.ecommerce.customer.profile.update(
    customerConnection,
    {
      body: {
        phone_number: newPhoneNumber,
      } satisfies IEcommerceCustomer.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 5. Validate phone_number changed
  TestValidator.equals(
    "phone number updated",
    updatedProfile.phone_number,
    newPhoneNumber,
  );
  // 6. Validate display_name unchanged
  TestValidator.equals(
    "display name preserved",
    updatedProfile.display_name,
    initialProfile.display_name,
  );
  // 7. Validate updated_at timestamp refreshed
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    new Date(updatedProfile.updated_at).getTime() >
      new Date(initialProfile.updated_at).getTime(),
  );
  // 8. Validate immutable fields unchanged
  TestValidator.equals("id unchanged", updatedProfile.id, initialProfile.id);
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    initialProfile.created_at,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedProfile.deleted_at,
    initialProfile.deleted_at,
  );
}
