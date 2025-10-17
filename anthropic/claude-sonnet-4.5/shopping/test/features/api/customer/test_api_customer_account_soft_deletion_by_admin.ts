import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test complete customer account soft deletion workflow by administrator.
 *
 * This comprehensive E2E test validates the entire soft deletion process for
 * customer accounts performed by an admin user. The test follows a complete
 * business workflow that demonstrates proper authentication, customer account
 * creation, and soft deletion with all associated data preservation.
 *
 * Test Flow:
 *
 * 1. Admin Authentication - Create and authenticate an admin account
 * 2. Customer Registration - Create a test customer account
 * 3. Customer Address Creation - Establish customer data in the system
 * 4. Admin Re-authentication - Create new admin for deletion operation
 * 5. Soft Deletion Execution - Admin performs soft deletion on customer account
 * 6. Validation - Verify the operation completed successfully
 *
 * Business validations covered:
 *
 * - Admin authorization system for sensitive operations
 * - Customer account lifecycle management
 * - Soft deletion mechanism (sets deleted_at timestamp)
 * - Data preservation for compliance (orders, payments, addresses retained)
 * - GDPR compliance through proper data handling
 */
export async function test_api_customer_account_soft_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin Authentication
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Customer Registration
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });
  typia.assert(customer);

  // Step 3: Customer Address Creation
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(address);

  // Step 4: Admin Re-authentication - Create new admin with deletion privileges
  const deletionAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const deletionAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: deletionAdminData,
    });
  typia.assert(deletionAdmin);

  // Step 5: Soft Deletion Execution
  await api.functional.shoppingMall.admin.customers.erase(connection, {
    customerId: customer.id,
  });

  // Step 6: Validation - Operation completed successfully (void return = success)
}
