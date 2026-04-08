import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer login failure with incorrect password credentials.
 *
 * Validates that the customer authentication system properly rejects login attempts with invalid passwords while maintaining account accessibility with correct credentials. Ensures that failed login attempts do not lock the account and that the system returns appropriate HTTP 401 Unauthorized status.
 *
 * The test verifies security best practices by confirming that authentication failures are handled gracefully without exposing whether the email or password was incorrect, and that legitimate accounts remain functional after failed attempts.
 *
 * 1. Register a new customer account with unique email and password credentials.
 * 2. Attempt login with correct email but incorrect password, expecting HTTP 401 error.
 * 3. Verify the failed login throws HttpError with status code 401.
 * 4. Attempt login again with correct email and correct password.
 * 5. Verify the successful login returns valid authentication tokens and customer data.
 * 6. Validate that the account remains accessible after failed login attempts.
 */
export async function test_api_customer_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account with known credentials
  const registerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const registeredCustomer = await authorize_customer_join(registerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(registeredCustomer);
  // 2. Attempt login with incorrect password
  const failedLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login with incorrect password returns 401",
    401,
    async () =>
      await authorize_customer_login(failedLoginConnection, {
        body: {
          email: customerEmail,
          password: "incorrect_password_12345",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallCustomer.ILogin,
      }),
  );
  // 3. Attempt login with correct password to verify account is not locked
  const successfulLoginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(
    successfulLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(loginResult);
  // 4. Validate successful login response
  TestValidator.equals(
    "login returns correct customer email",
    loginResult.email,
    customerEmail,
  );
  TestValidator.predicate(
    "login returns valid access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returns valid refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "customer account is not banned",
    loginResult.banned === false,
  );
}
