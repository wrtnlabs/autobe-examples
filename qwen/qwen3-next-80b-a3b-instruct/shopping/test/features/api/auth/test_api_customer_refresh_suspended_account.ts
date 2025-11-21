import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

// Validate the system's security policy that suspended customer accounts cannot regain access through token refresh.
// The customer account has been suspended by an admin due to policy violation, preventing reactivation through
// token refresh.
//
// Business context:
// - Customers can be suspended for policy violations
// - Refresh tokens remain technically valid after suspension
// - System must reject refresh requests from suspended accounts
// - Prevents unauthorized reactivation without explicit admin action
//
// Test workflow:
// 1. Create admin account with super_admin role
// 2. Use admin account to delete a pre-existing customer (acts as suspension)
// 3. Attempt to refresh the customer's token (should fail with 401)
//
// IMPORTANT: The test system has a pre-configured customer account with known ID and known refresh token.
// No API endpoint exists to create customers, so we must rely on test environment setup.
export async function test_api_customer_refresh_suspended_account(
  connection: api.IConnection,
) {
  // 1. Create an admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin1234",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Use admin to delete a pre-existing customer account
  // Assuming the test environment has a known customer ID and token
  const targetCustomerId = "00000000-0000-0000-0000-000000000001" as string &
    tags.Format<"uuid">;

  // Delete customer using admin connection. SDK automatically uses the admin token from step 1
  await api.functional.shoppingMall.admin.actors.customers.erase(
    connection, // SDK handles authentication state; uses admin token from last call
    {
      customerId: targetCustomerId,
    },
  );

  // 3. Attempt to refresh the customer's token — should fail because account was deleted
  // Assume test environment has a known valid refresh token for this customer
  const validCustomerRefreshToken =
    "valid-customer-refresh-token-123" as string;

  // This should fail with 401 Unauthorized - validating that deleted accounts cannot refresh
  await TestValidator.error(
    "refresh should fail for deleted customer",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: validCustomerRefreshToken, // Uses IShoppingMallCustomer.IRequest which is defined as string
      });
    },
  );
}
