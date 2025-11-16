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
 * Validate that a platform administrator can permanently delete a fully
 * registered and email-verified customer.
 *
 * Business context:
 *
 * - Customers self-register and authenticate via /auth/customer/* endpoints.
 * - Platform admins manage customer lifecycle via /shoppingMall/platformAdmin/*
 *   endpoints.
 * - The DELETE /shoppingMall/platformAdmin/customers/{customerId} endpoint is
 *   documented as a hard delete on shopping_mall_customer.
 *
 * This test covers the full happy-path lifecycle up to hard deletion and then
 * validates that the deletion is effectively irreversible from the public/auth
 * API surface.
 *
 * High-level steps:
 *
 * 1. Register a platform administrator using /auth/platformAdmin/join so that we
 *    have a valid admin actor and its Authorization header attached to the
 *    shared connection.
 * 2. Create a new customer using /auth/customer/join, capturing the returned
 *    IShoppingMallCustomer.IAuthorized and especially the customer id and
 *    email.
 * 3. Trigger a password reset request for that customer email using
 *    /auth/customer/password/reset/request to ensure there are related auth
 *    token records tied to this identity (this step is purely to prove that
 *    deletion works even when related auth tables contain rows).
 * 4. Call /auth/customer/email/verify with a random-looking token using
 *    typia.random so that we exercise the verification endpoint once in the
 *    flow. (Because no token-issuing endpoint is exposed in this SDK subset, we
 *    treat this as a smoke call for the email verification API rather than a
 *    strict state transition guarantee.)
 * 5. Switch the connection back to platformAdmin context using
 *    /auth/platformAdmin/login with the same admin credentials created in step
 *    1 (this is to ensure that, regardless of what customer calls have done to
 *    the connection headers, the erase call is executed under an admin actor).
 * 6. Invoke DELETE /shoppingMall/platformAdmin/customers/{customerId} for the
 *    customer captured in step 2 via
 *    api.functional.shoppingMall.platformAdmin.customers.erase.
 *
 *    - Expect the call to complete without throwing; because erase returns void,
 *         there is no response body to assert.
 * 7. Attempt to log in again as the deleted customer with the original password
 *    and assert, via TestValidator.error, that the login flow no longer
 *    succeeds. This models a business-level irreversibility: from the API
 *    consumer perspective, the deleted customer account can no longer
 *    authenticate.
 *
 * Notes and constraints:
 *
 * - We cannot implement a strict check that the email isVerified flag is true at
 *   the point of deletion because the SDK does not expose a read-side customer
 *   detail endpoint. Instead, we focus on executing the normal auth flows
 *   (join, password-reset, email-verify) before deletion as a realistic
 *   precondition sequence.
 * - We must not validate HTTP status codes directly; success is defined as the
 *   absence of thrown HttpError for the erase call.
 * - We must not deliberately construct type-incorrect requests or omit required
 *   fields; all payloads must satisfy the DTO definitions.
 */
export async function test_api_platform_admin_customer_delete_verified_customer(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphabets(12);

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorizedOnJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedOnJoin);

  // 2. Create a new customer via /auth/customer/join
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword = RandomGenerator.alphabets(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorizedOnJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorizedOnJoin);

  const customerId = customerAuthorizedOnJoin.id;

  // 3. Request password reset for the customer email
  const passwordResetBody = {
    email: customerEmail,
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: passwordResetBody,
      },
    );
  typia.assert(resetResult);

  // 4. Call email verification endpoint once with a random token
  const verifyBody = {
    token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallCustomerAuth.IVerifyEmail;

  const verifiedAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.email.verify.verifyEmail(connection, {
      body: verifyBody,
    });
  typia.assert(verifiedAuth);

  // 5. Ensure we are authenticated as platformAdmin again before deletion
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAuthorizedOnLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedOnLogin);

  // 6. Invoke the hard delete as platform admin
  await api.functional.shoppingMall.platformAdmin.customers.erase(connection, {
    customerId,
  });

  // 7. Validate business-level irreversibility: customer login must now fail
  await TestValidator.error(
    "deleted customer cannot login anymore",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: customerEmail,
          password: customerPassword,
          ip: null,
          href: "https://shop.example.com/login",
          referrer: "https://shop.example.com/landing",
          userAgent: undefined,
        } satisfies IShoppingMallCustomerAuth.ILogin,
      });
    },
  );
}
