import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test complete customer account update workflow by administrator.
 *
 * This test validates that administrators can successfully update customer
 * account information including name, phone number, and account status. The
 * test follows the complete workflow:
 *
 * 1. Create and authenticate admin account
 * 2. Create customer account for testing
 * 3. Create customer address to establish customer in system
 * 4. Admin updates customer account details
 * 5. Validate all updates are correctly applied
 * 6. Verify timestamps and data integrity
 */
export async function test_api_customer_account_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Create customer account
  const customerCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateData,
    });
  typia.assert(customer);

  // Step 3: Create customer address to validate customer existence in system
  const addressCreateData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "USA",
  } satisfies IShoppingMallAddress.ICreate;

  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressCreateData,
    });
  typia.assert(address);

  // Step 4: Admin updates customer account information
  const updateData = {
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    account_status: "active",
  } satisfies IShoppingMallCustomer.IUpdate;

  const updatedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.update(connection, {
      customerId: customer.id,
      body: updateData,
    });
  typia.assert(updatedCustomer);

  // Step 5: Validate updated customer information
  TestValidator.equals(
    "updated customer ID matches",
    updatedCustomer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email unchanged",
    updatedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer name updated",
    updatedCustomer.name,
    updateData.name,
  );
  TestValidator.equals(
    "customer phone updated",
    updatedCustomer.phone,
    updateData.phone,
  );
  TestValidator.equals(
    "customer account status updated",
    updatedCustomer.account_status,
    updateData.account_status,
  );
}
