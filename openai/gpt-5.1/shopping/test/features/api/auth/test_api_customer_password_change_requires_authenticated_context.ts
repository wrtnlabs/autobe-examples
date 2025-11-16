import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Ensure customer password change requires an authenticated context.
 *
 * Business intent:
 *
 * - Verify that POST /auth/customer/password/change cannot be invoked anonymously
 *   (without a valid Authorization header) even when the request body is
 *   syntactically valid.
 * - Demonstrate that the same payload succeeds when the customer is properly
 *   authenticated, proving the failure is due to authentication only.
 *
 * Steps:
 *
 * 1. Register (join) a new customer using a random IShoppingMallCustomerAuth.IJoin
 *    payload. This call also authenticates the base `connection` by setting its
 *    Authorization header via SDK side-effect and returns
 *    IShoppingMallCustomer.IAuthorized.
 * 2. Build a valid IShoppingMallCustomerAuth.IChangePassword payload using the
 *    original password as `currentPassword` and a new random password as
 *    `newPassword`.
 * 3. Create an "unauthenticated" connection object by shallow-cloning the original
 *    connection and overriding `headers` with an empty object at construction
 *    time. Do not touch headers afterwards.
 * 4. With the unauthenticated connection, attempt to call
 *    api.functional.auth.customer.password.change.changePassword and assert
 *    that it throws using `await TestValidator.error`, confirming that
 *    anonymous access is forbidden.
 * 5. With the original authenticated connection, call the same changePassword
 *    operation using the prepared payload and assert it succeeds, validating
 *    the response shape with typia.assert and that the returned customer id
 *    matches the one from the join step.
 */
export async function test_api_customer_password_change_requires_authenticated_context(
  connection: api.IConnection,
) {
  // 1. Register a new customer and implicitly authenticate the base connection
  const initialPassword = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: initialPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(joined);

  // 2. Prepare a valid change-password payload
  const changeBody = {
    currentPassword: initialPassword,
    newPassword: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomerAuth.IChangePassword;

  // 3. Create an unauthenticated connection clone
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Calling changePassword without authentication must fail
  await TestValidator.error(
    "password change must fail without authentication",
    async () => {
      await api.functional.auth.customer.password.change.changePassword(
        unauthenticatedConnection,
        {
          body: changeBody,
        },
      );
    },
  );

  // 5. Calling changePassword with authenticated connection must succeed
  const changed: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.password.change.changePassword(
      connection,
      {
        body: changeBody,
      },
    );
  typia.assert<IShoppingMallCustomer.IAuthorized>(changed);

  // Validate that the identity remains the same between join and change
  TestValidator.equals(
    "customer id remains consistent after password change",
    changed.id,
    joined.id,
  );
  TestValidator.equals(
    "customer email remains consistent after password change",
    changed.email,
    joined.email,
  );
}
