import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

/**
 * Validate that an admin can update profile details (e.g. name, phone number)
 * for a specific customer in the shopping platform. Also ensure that only
 * mutable fields are updatable and the update is accurately reflected.
 *
 * Steps:
 *
 * 1. Register a new admin account (api.functional.auth.admin.join)
 * 2. Register a new customer account (api.functional.auth.customer.join)
 * 3. Log in as the admin (token switch handled by join)
 * 4. As admin, update the customer profile fields 'name' and 'phone' via
 *    api.functional.shopping.admin.customers.update
 * 5. Verify the customer profile fields have been updated as expected
 */
export async function test_api_admin_update_customer_profile(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminInput = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    role: "support", // Example role - must match allowed roles
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);

  // 2. Register a new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customerInput = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://test.example.com/join",
    referrer: "https://test.example.com/landing",
  } satisfies IShoppingCustomer.ICreate;
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });
  typia.assert(customer);

  // 3. Admin context is already set by join (token)

  // 4. Admin updates the customer profile fields 'name' and 'phone'
  const newName = RandomGenerator.name();
  const newPhone = RandomGenerator.mobile();
  const updateBody = {
    name: newName,
    phone: newPhone,
  } satisfies IShoppingCustomer.IUpdate;
  const updated: IShoppingCustomer =
    await api.functional.shopping.admin.customers.update(connection, {
      customerId: customer.id,
      body: updateBody,
    });
  typia.assert(updated);
  TestValidator.equals("updated customerId matches", updated.id, customer.id);
  TestValidator.equals("updated customer name", updated.name, newName);
  TestValidator.equals("updated customer phone", updated.phone, newPhone);
}
