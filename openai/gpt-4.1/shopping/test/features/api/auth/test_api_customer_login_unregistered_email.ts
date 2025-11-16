import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate failed login for unregistered customer email.
 *
 * This test ensures that a login attempt with an email address that is not
 * registered in the system fails as expected. The test supplies a randomly
 * generated email (which has almost zero chance of existing in the DB), a
 * random password, and random valid URIs for href and referrer, omitting the
 * optional IP property. The assertion checks that authentication fails and that
 * no sensitive information is leaked in error responses.
 *
 * Steps:
 *
 * 1. Construct a login request with a random (non-existent) email address, random
 *    password, and random valid href/referrer URI values.
 * 2. Attempt to login via the /auth/customer/login endpoint.
 * 3. Assert that an error is thrown, indicating authentication failure.
 */
export async function test_api_customer_login_unregistered_email(
  connection: api.IConnection,
) {
  // Step 1: Generate login credentials for a non-existent email
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // Do NOT set ip
  } satisfies IShoppingMallCustomer.ILogin;

  // Step 2/3: Attempt login and validate error is thrown
  await TestValidator.error(
    "login with unregistered email should fail",
    async () => {
      await api.functional.auth.customer.login(connection, { body: loginBody });
    },
  );
}
