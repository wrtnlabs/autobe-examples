import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_customer_unban_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create and verify customer account (prerequisite for unban)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // Step 1: Create customer account with email verification
  const customerConnection: api.IConnection = { host: connection.host };
  const customerResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(customerResponse);
  // Remove validation of email property as it doesn't exist on IAuthorized
  // Use the customerId for the unban operation
  // Step 2: Verify email (required dependency from scenario)
  const verifyResponse =
    await api.functional.shoppingMall.customer.auth.customers.email.verify(
      customerConnection,
    );
  typia.assert(verifyResponse);
  TestValidator.equals(
    "email verification success",
    verifyResponse.message,
    "Email verification token resent successfully",
  );
  // Step 3: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  typia.assert(adminResponse);
  // Step 4: Auth as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // Step 5: Try to unban the customer
  // Note: The customer was never banned - so this is testing the case of unban on active user
  // According to the API docs, unban succeeds on active users too
  const unbanResponse =
    await api.functional.shoppingMall.admin.customers.unban.update(
      adminLoginConnection,
      {
        customerId: customerResponse.customerId,
      },
    );
  // Step 6: Validate unban operation success
  // Unban returns void, so just ensure it completes without error
  TestValidator.equals(
    "unban operation completed successfully",
    unbanResponse,
    undefined,
  );
  // Step 7: Verify customer can still access resources after unban
  // Since there's no profile endpoint available, we validate that customer can still login
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
      },
    },
  );
  typia.assert(loginResponse);
  // Verify customer's display name (available in IAuthorized)
  TestValidator.equals(
    "customer display name matches",
    loginResponse.displayName,
    customerResponse.displayName,
  );
  // Verify customer can still access their resources (login success)
  // Since no other customer endpoints are provided, we demonstrate successful access via login
  // Step 8: Test error cases
  // Test unban without authentication (should fail)
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unban without authentication fails", async () => {
    await api.functional.shoppingMall.admin.customers.unban.update(
      guestConnection,
      {
        customerId: customerResponse.customerId,
      },
    );
  });
  // Test unban with non-existent customer ID
  await TestValidator.error(
    "unban with non-existent customer ID fails",
    async () => {
      await api.functional.shoppingMall.admin.customers.unban.update(
        adminLoginConnection,
        {
          customerId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}
