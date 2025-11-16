import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

/**
 * Test the update of an authenticated customer session by an admin user.
 *
 * This test performs the following steps:
 *
 * 1. Registers and logs in an admin user to authenticate.
 * 2. Creates a new customer account.
 * 3. Creates a new authenticated session for the created customer.
 * 4. As an admin, updates the customer's session details partially and fully,
 *    including connection metadata like IP address, href, referrer, and
 *    expiration.
 * 5. Validates that updates succeed and session data reflect changes correctly.
 *
 * This scenario ensures that only admins can update customer sessions,
 * verifying proper authorization, session data integrity, and audit log
 * maintenance.
 *
 * All API responses are asserted for type safety using typia.assert.
 */
export async function test_api_admin_update_customer_session_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "securepassword123",
    phone_number: RandomGenerator.mobile(),
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const adminUser: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminUser);

  // 2. Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: "securepassword123",
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminAuthorized);

  // 3. Customer account creation
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "customerpass123",
    full_name: RandomGenerator.name(),
    ip: "192.168.1." + `${RandomGenerator.alphaNumeric(1)}`,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 4. Create a new authenticated customer session for the customer
  const customerSessionCreateBody = {
    ip: "203.0.113.5",
    href: "https://shop.example.com/account",
    referrer: "https://shop.example.com",
  } satisfies IShoppingMallCustomerSession.ICreate;
  const customerSession: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.customer.customers.customerSessions.create(
      connection,
      {
        customerId: customer.id,
        body: customerSessionCreateBody,
      },
    );
  typia.assert(customerSession);

  // 5. Admin updates the customer's session details (partial update)
  const updateBody1: IShoppingMallCustomerSession.IUpdate = {
    ip: "203.0.113.10",
    href: "https://shop.example.com/account/settings",
  };
  const updatedSession1: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.admin.customers.customerSessions.update(
      connection,
      {
        customerId: customer.id,
        customerSessionId: customerSession.id,
        body: updateBody1,
      },
    );
  typia.assert(updatedSession1);
  TestValidator.equals(
    "IP should be updated",
    updatedSession1.ip,
    updateBody1.ip,
  );
  TestValidator.equals(
    "Href should be updated",
    updatedSession1.href,
    updateBody1.href,
  );
  TestValidator.equals(
    "Referrer should remain unchanged",
    updatedSession1.referrer,
    customerSession.referrer,
  );

  // 6. Admin updates with full update including expiration
  const futureDateISO = new Date(Date.now() + 3600 * 1000).toISOString();
  const updateBody2: IShoppingMallCustomerSession.IUpdate = {
    ip: "203.0.113.15",
    href: "https://shop.example.com/dashboard",
    referrer: "https://shop.example.com/home",
    expired_at: futureDateISO,
  };
  const updatedSession2: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.admin.customers.customerSessions.update(
      connection,
      {
        customerId: customer.id,
        customerSessionId: customerSession.id,
        body: updateBody2,
      },
    );
  typia.assert(updatedSession2);
  TestValidator.equals("IP updated fully", updatedSession2.ip, updateBody2.ip);
  TestValidator.equals(
    "Href updated fully",
    updatedSession2.href,
    updateBody2.href,
  );
  TestValidator.equals(
    "Referrer updated fully",
    updatedSession2.referrer,
    updateBody2.referrer,
  );
  TestValidator.equals(
    "Expired_at updated",
    updatedSession2.expires_at,
    updateBody2.expired_at,
  );
}
