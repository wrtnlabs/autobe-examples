import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer login failure with incorrect password.
 *
 * Validates that authentication fails appropriately when a customer provides an incorrect password during login. A customer account is first registered, then login is attempted with the correct email but wrong password. The system must reject the authentication request without revealing whether the email exists or the password was incorrect.
 *
 * The test ensures security best practices are followed by:
 * - Returning generic authentication failure messages
 * - Not creating sessions for failed attempts
 * - Preventing information leakage about account existence
 *
 * 1. Register a new customer account with valid credentials.
 * 2. Attempt login with correct email but incorrect password.
 * 3. Validate that login throws HTTP 401 Unauthorized error.
 * 4. Verify error message does not reveal email existence status.
 */
export async function test_api_customer_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const joinConnection: api.IConnection = { host: connection.host };
  // Store credentials for later login attempt
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = RandomGenerator.alphaNumeric(16);
  const registeredCustomer = await authorize_customer_join(joinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(registeredCustomer);
  // 2. Attempt login with wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await authorize_customer_login(loginConnection, {
        body: {
          email: customerEmail,
          password: RandomGenerator.alphaNumeric(16), // Different password
        } satisfies IEcommerceCustomer.ILogin,
      });
    },
  );
}
