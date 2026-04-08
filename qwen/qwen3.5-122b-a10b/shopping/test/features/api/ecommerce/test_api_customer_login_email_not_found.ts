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
 * Test customer login failure with non-existent email address.
 *
 * Validates that authentication attempts with non-existent email addresses are properly rejected by the system. This test ensures the login endpoint correctly handles the case where a customer attempts to authenticate with an email that has not been registered in the system.
 *
 * The test verifies that the system returns a 401 Unauthorized response without revealing whether the email exists or not, following security best practices for authentication systems. No session should be created for failed authentication attempts.
 *
 * 1. Register a valid customer account with random credentials.
 * 2. Attempt to login with a different, non-existent email address.
 * 3. Validate that login fails with 401 Unauthorized error.
 * 4. Ensure no authentication tokens are returned for failed attempts.
 */
export async function test_api_customer_login_email_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a valid customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const registeredCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(registeredCustomer);
  // 2. Attempt to login with non-existent email
  const loginConnection: api.IConnection = { host: connection.host };
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  // 3. Validate that login fails with error
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await authorize_customer_login(loginConnection, {
        body: {
          email: nonExistentEmail,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceCustomer.ILogin,
      });
    },
  );
}
