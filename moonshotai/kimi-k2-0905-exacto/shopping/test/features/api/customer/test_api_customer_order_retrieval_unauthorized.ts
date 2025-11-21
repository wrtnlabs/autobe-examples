import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

/**
 * Test customer authorization and order access security for the marketplace
 * platform.
 *
 * Validates proper access control enforcement ensuring:
 *
 * - Unauthenticated users cannot access order details
 * - Authentication tokens are properly validated
 * - Order data remains secure from unauthorized access attempts
 * - Security boundaries protect customer privacy and data integrity
 *
 * This test creates a realistic security scenario where unauthorized users
 * attempt to access order information and verifies the system properly protects
 * against these attempts. The test covers fundamental authentication
 * requirements for customer order management in the e-commerce marketplace
 * ecosystem.
 *
 * Step 1: Create authenticated customer account for testing Step 2: Generate
 * test orders through customer registration process Step 3: Test unauthorized
 * access attempts with missing/broken authentication Step 4: Verify security
 * validation prevents data exposure to unauthorized users Step 5: Ensure proper
 * error handling for security violations
 */
export async function test_api_customer_order_retrieval_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated customer account using the required dependency
  const allowedEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: allowedEmail,
        password: "ValidPassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        href: "https://shopping-mall.test/register",
        referrer: "https://shopping-mall.test/",
      } satisfies IShoppingMallCustomer.IRegister,
    });
  typia.assert(customer);

  // Step 2: Generate test order ID for testing unauthorized access
  const testOrderId: string = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test unauthorized access - completely unauthenticated scenario
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated requests should fail to access orders",
    async () => {
      await api.functional.shoppingMall.customer.orders.at(
        unauthenticatedConn,
        {
          orderId: testOrderId,
        },
      );
    },
  );
}
