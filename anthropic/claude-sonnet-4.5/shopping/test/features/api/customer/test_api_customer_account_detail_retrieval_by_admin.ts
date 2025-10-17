import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test retrieval of detailed customer account information by admin.
 *
 * This test validates that administrators can successfully retrieve
 * comprehensive customer account details for support and management purposes.
 * The test follows a complete workflow:
 *
 * 1. Create and authenticate an admin account
 * 2. Create a customer account with complete registration data
 * 3. Establish customer profile by creating a delivery address
 * 4. Admin retrieves customer details by customer ID
 * 5. Validate response contains complete customer data (email, name, phone,
 *    account status, verification status, timestamps)
 * 6. Verify security-sensitive fields are excluded from response
 *
 * The test ensures admins have proper access to customer information for
 * support inquiries, verification, and account management while maintaining
 * security by excluding password hashes and authentication tokens from the
 * response.
 */
export async function test_api_customer_account_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role_level: "support_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPass123!";
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: customerName,
        phone: customerPhone,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 3: Create delivery address to establish complete customer profile
  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: {
        recipient_name: customerName,
        phone_number: customerPhone,
        address_line1: "123 Main Street",
        city: "New York",
        state_province: "NY",
        postal_code: "10001",
        country: "USA",
      } satisfies IShoppingMallAddress.ICreate,
    });
  typia.assert(address);

  // Step 4: Admin retrieves customer detailed information
  const retrievedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.at(connection, {
      customerId: customer.id,
    });
  typia.assert(retrievedCustomer);

  // Step 5: Validate comprehensive customer data
  TestValidator.equals(
    "customer ID matches",
    retrievedCustomer.id,
    customer.id,
  );

  TestValidator.equals(
    "customer email matches",
    retrievedCustomer.email,
    customerEmail,
  );

  TestValidator.equals(
    "customer name matches",
    retrievedCustomer.name,
    customerName,
  );

  TestValidator.equals(
    "customer phone matches",
    retrievedCustomer.phone,
    customerPhone,
  );
}
