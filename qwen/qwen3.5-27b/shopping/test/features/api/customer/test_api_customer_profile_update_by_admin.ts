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
 * Test that an authenticated administrator can successfully update a customer's profile information including display name and phone number.
 *
 * This test validates the admin's ability to modify customer profiles across actors,
 * ensuring proper authorization, data integrity, and response structure.
 */
export async function test_api_customer_profile_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup: Authenticate as customer to get valid customerId
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  // 3. Prepare update data
  const updatedDisplayName: string = RandomGenerator.name();
  const updatedPhoneNumber: string = RandomGenerator.mobile();
  const updateBody = {
    display_name: updatedDisplayName,
    phone_number: updatedPhoneNumber,
  } satisfies IShoppingMallCustomer.IUpdate;
  // 4. Admin updates customer profile
  const updatedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.update(adminConnection, {
      customerId,
      body: updateBody,
    });
  typia.assert(updatedCustomer);
  // 5. Validate response structure and data
  TestValidator.equals("customer id matches", updatedCustomer.id, customerId);
  TestValidator.equals(
    "display name updated",
    updatedCustomer.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "phone number updated",
    updatedCustomer.phone_number,
    updatedPhoneNumber,
  );
  TestValidator.equals(
    "status remains active",
    updatedCustomer.status,
    "active",
  );
  TestValidator.equals("deleted_at is null", updatedCustomer.deleted_at, null);
  TestValidator.predicate("updated_at is valid date-time", () => {
    const updated = new Date(updatedCustomer.updated_at);
    return !isNaN(updated.getTime());
  });
  TestValidator.predicate("created_at is valid date-time", () => {
    const created = new Date(updatedCustomer.created_at);
    return !isNaN(created.getTime());
  });
  TestValidator.predicate("updated_at is >= created_at", () => {
    const updated = new Date(updatedCustomer.updated_at);
    const created = new Date(updatedCustomer.created_at);
    return updated.getTime() >= created.getTime();
  });
}
