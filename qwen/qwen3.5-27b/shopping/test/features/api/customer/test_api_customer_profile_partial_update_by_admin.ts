import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an administrator can perform a partial profile update by changing
 * only the display name while keeping the phone number unchanged.
 *
 * This test validates that:
 * 1. Partial updates are supported (only specified fields are changed)
 * 2. Unspecified fields (phone_number) retain their original values
 * 3. The update operation is atomic and doesn't clear unspecified fields
 * 4. Response includes all customer fields for verification
 */
export async function test_api_customer_profile_partial_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer setup - register customer with initial profile data
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Store original values for validation
  const originalDisplayName = customer.display_name;
  const originalPhoneNumber = customer.phone_number;
  const originalCreatedAt = customer.created_at;
  const customerId = customer.id;
  // 3. Admin performs partial update - only change display_name
  const updatedCustomer =
    await api.functional.shoppingMall.admin.customers.update(adminConnection, {
      customerId,
      body: {
        display_name: `Updated ${originalDisplayName}`,
      } satisfies IShoppingMallCustomer.IUpdate,
    });
  typia.assert(updatedCustomer);
  // 4. Validate partial update behavior
  // Verify display_name was updated
  TestValidator.equals(
    "display_name updated",
    updatedCustomer.display_name,
    `Updated ${originalDisplayName}`,
  );
  // Verify phone_number remained unchanged
  TestValidator.equals(
    "phone_number unchanged",
    updatedCustomer.phone_number,
    originalPhoneNumber,
  );
  // Verify other fields remain intact
  TestValidator.equals(
    "email unchanged",
    updatedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "status unchanged",
    updatedCustomer.status,
    customer.status,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedCustomer.created_at,
    originalCreatedAt,
  );
  // Verify updated_at is different from created_at (timestamp refreshed)
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedCustomer.updated_at,
    originalCreatedAt,
  );
}
