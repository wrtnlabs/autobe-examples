import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

/**
 * Validate that a platform administrator can update a verified customer’s basic
 * profile (name, status) via the admin customer update endpoint.
 *
 * Business flow:
 *
 * 1. Register a platform admin using /auth/platformAdmin/join (auto-login with
 *    token).
 * 2. Register a customer using /auth/customer/join so we have a concrete
 *    customerId.
 * 3. Verify the customer’s email via /auth/customer/email/verify to ensure
 *    isVerified is true.
 * 4. Optionally initiate a password reset request for the customer.
 * 5. Switch back to the platformAdmin session via /auth/platformAdmin/login.
 * 6. As platformAdmin, call PUT /shoppingMall/platformAdmin/customers/{customerId}
 *    with IShoppingMallCustomer.IUpdate to change name and status only.
 * 7. Assert that the response IShoppingMallCustomer has:
 *
 *    - Id equal to the original customerId
 *    - Updated name and status values
 *    - IsVerified still true
 *    - CreatedAt unchanged, and updatedAt newer than before.
 */
export async function test_api_platform_admin_customer_update_basic_profile(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-authenticates via Authorization header)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail: string & tags.Format<"email"> = adminAuthorized.email;
  const adminPassword: string = adminJoinBody.password;

  // 2. Register customer (this will switch Authorization to customer)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId = customerAuthorized.id;
  const originalCreatedAt = customerAuthorized.createdAt;

  // 3. Verify customer email (we do not know the token, so rely on SDK random)
  // Since the real verify-email flow requires an opaque token delivered out-of-band,
  // and the provided SDK example tests call verifyEmail with typia.random, we follow
  // the same pattern here to ensure isVerified can be true in subsequent auth states.
  const verifiedCustomerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.email.verify.verifyEmail(connection, {
      body: typia.random<IShoppingMallCustomerAuth.IVerifyEmail>(),
    });
  typia.assert(verifiedCustomerAuth);

  // 4. Optionally initiate password reset request (no behavioral assertions needed)
  const passwordResetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: customerJoinBody.email,
        } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset,
      },
    );
  typia.assert(passwordResetResult);

  // 5. Switch back to platform admin context via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAuthorizedAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedAgain);

  // 6. Perform the admin customer update (name, status only)
  const newName: string = RandomGenerator.name();
  const newStatus: string = "suspended";

  const updateBody = {
    name: newName,
    status: newStatus,
  } satisfies IShoppingMallCustomer.IUpdate;

  const updatedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.platformAdmin.customers.update(
      connection,
      {
        customerId,
        body: updateBody,
      },
    );
  typia.assert(updatedCustomer);

  // 7. Business assertions on returned customer
  TestValidator.equals(
    "updated customer id should match original customer id",
    updatedCustomer.id,
    customerId,
  );

  TestValidator.equals(
    "updated customer name should match new name",
    updatedCustomer.name,
    newName,
  );

  TestValidator.equals(
    "updated customer status should match new status",
    updatedCustomer.status,
    newStatus,
  );

  TestValidator.predicate(
    "updated customer should remain verified",
    updatedCustomer.isVerified === true,
  );

  TestValidator.equals(
    "createdAt should remain unchanged after update",
    updatedCustomer.createdAt,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updatedAt should be same or later than original createdAt",
    new Date(updatedCustomer.updatedAt).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
}
