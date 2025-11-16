import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Verify that customer password change rejects an incorrect current password.
 *
 * Business goal: Ensure that an already authenticated shopping mall customer
 * cannot change their password unless they supply the correct existing
 * password. This guards against account takeover scenarios where an attacker
 * somehow obtains an access token but does not know the actual password.
 *
 * Test flow:
 *
 * 1. Self-register a customer using /auth/customer/join with a known plaintext
 *    password and realistic registration metadata, receiving an
 *    IShoppingMallCustomer.IAuthorized envelope. The Nestia SDK will
 *    automatically propagate the access token into the shared connection
 *    headers, so subsequent calls are authenticated as this customer.
 * 2. While authenticated, call /auth/customer/password/change with an
 *    IShoppingMallCustomerAuth.IChangePassword body whose currentPassword is
 *    deliberately wrong (does not match the join password) and whose
 *    newPassword is some random strong-looking string.
 * 3. Assert, using TestValidator.error, that the changePassword call fails —
 *    meaning it throws an HttpError instead of returning
 *    IShoppingMallCustomer.IAuthorized — thereby confirming that the backend
 *    enforces correct current password verification.
 * 4. Because there is no dedicated “login” API in the available SDK surface, skip
 *    explicit re-login verification and rely on the fact that a failed
 *    changePassword call cannot return an authorization envelope. This still
 *    validates the key rule that incorrect current passwords are rejected.
 */
export async function test_api_customer_password_change_rejects_incorrect_current_password(
  connection: api.IConnection,
) {
  // 1. Register a new customer with a known password
  const plainPassword = "P@ssw0rd-" + RandomGenerator.alphaNumeric(8);

  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: plainPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  // 2. Build a change-password payload with incorrect currentPassword
  const changeBody = {
    currentPassword: plainPassword + "-wrong", // definitely not equal
    newPassword: "N3wP@ss-" + RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallCustomerAuth.IChangePassword;

  // 3. Assert that changePassword call fails with incorrect current password
  await TestValidator.error(
    "password change with wrong current password must fail",
    async () => {
      await api.functional.auth.customer.password.change.changePassword(
        connection,
        {
          body: changeBody,
        },
      );
    },
  );
}
