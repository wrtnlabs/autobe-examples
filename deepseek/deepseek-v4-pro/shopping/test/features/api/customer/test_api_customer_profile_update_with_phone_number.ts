import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer can update both their display name and
 * phone number in a single profile update operation.
 *
 * Verifies the combined field update capability of the customer profile
 * endpoint. After registering a new customer, submits a profile update with
 * a new display_name and an explicit phone_number string, then confirms the
 * response returns both fields with the new values.
 *
 * The test also ensures that immutable identity fields (id and email) remain
 * unchanged after the update, and that updated_at advances past the original
 * registration timestamp to reflect the modification.
 *
 * 1. Register and authenticate a new customer via authorize_customer_join.
 * 2. Capture the original id, email, and updated_at from the join response.
 * 3. Submit a profile update with a new display name and phone number.
 * 4. Validate the updated profile: new field values persisted, identity
 *    fields preserved, and updated_at timestamp advanced.
 */
export async function test_api_customer_profile_update_with_phone_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Prepare profile update with new display name and phone number
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  const updateBody = {
    display_name: newDisplayName,
    phone_number: newPhoneNumber,
  } satisfies IShoppingMallCustomer.IUpdate;
  // 3. Update the profile
  const updated = await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    { body: updateBody },
  );
  typia.assert(updated);
  // 4. Validate the response
  TestValidator.equals(
    "display name updated",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number updated",
    updated.phone_number,
    newPhoneNumber,
  );
  TestValidator.equals("email unchanged", updated.email, authorized.email);
  TestValidator.equals("id unchanged", updated.id, authorized.id);
  TestValidator.predicate(
    "updated_at advanced after profile edit",
    new Date(updated.updated_at).getTime() >
      new Date(authorized.updated_at).getTime(),
  );
}
