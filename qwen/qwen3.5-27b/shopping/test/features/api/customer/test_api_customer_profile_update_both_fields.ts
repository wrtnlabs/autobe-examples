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

export async function test_api_customer_profile_update_both_fields(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test updating both display name and phone number in a single customer profile update request.
   *
   * This test verifies that:
   * 1. Both display_name and phone_number can be updated atomically in one request
   * 2. The response contains the updated values
   * 3. Other profile fields (email, status) remain unchanged
   * 4. The updated_at timestamp is refreshed
   */
  // 1. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_customer_join(customerConnection, {
    body: {
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(registered);
  // Store original values for comparison
  const originalDisplayName = registered.display_name;
  const originalPhoneNumber = registered.phone_number;
  const originalEmail = registered.email;
  const originalStatus = registered.status;
  // 2. Generate new values for both fields
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  // Ensure new values are different from original
  TestValidator.notEquals(
    "new display name differs from original",
    newDisplayName,
    originalDisplayName,
  );
  TestValidator.notEquals(
    "new phone number differs from original",
    newPhoneNumber,
    originalPhoneNumber,
  );
  // 3. Update profile with both fields changed
  const updated = await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    {
      body: {
        display_name: newDisplayName,
        phone_number: newPhoneNumber,
      } satisfies IShoppingMallCustomer.IUpdate,
    },
  );
  typia.assert(updated);
  // 4. Validate the updated profile
  TestValidator.equals(
    "display name updated correctly",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number updated correctly",
    updated.phone_number,
    newPhoneNumber,
  );
  // 5. Verify unchanged fields
  TestValidator.equals("email remains unchanged", updated.email, originalEmail);
  TestValidator.equals(
    "status remains unchanged",
    updated.status,
    originalStatus,
  );
  TestValidator.equals(
    "customer ID remains unchanged",
    updated.id,
    registered.id,
  );
  // 6. Verify timestamps
  TestValidator.predicate("updated_at is a valid date-time", () => {
    const date = new Date(updated.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is after or equal to created_at", () => {
    return new Date(updated.updated_at) >= new Date(updated.created_at);
  });
}
