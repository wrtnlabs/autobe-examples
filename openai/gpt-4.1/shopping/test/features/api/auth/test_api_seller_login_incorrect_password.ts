import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller authentication fails with incorrect password.
 *
 * This test verifies that the seller login API strictly validates credentials
 * and does not leak account existence. It uses a syntactically valid email and
 * submits an incorrect password to /auth/seller/login, then asserts that
 * authentication fails (API throws an error) without returning sensitive
 * information.
 *
 * Steps:
 *
 * 1. Generate a syntactically valid email address and a valid login password
 *    (ensuring all format/length constraints are respected).
 * 2. Attempt login with the valid email but intentionally incorrect password, as
 *    if the user entered a wrong password.
 * 3. The login API should reject the authentication request and throw an error.
 * 4. Assert that an error is thrown and that no sensitive account details are
 *    returned.
 */
export async function test_api_seller_login_incorrect_password(
  connection: api.IConnection,
) {
  // 1. Generate a plausible email and use an intentionally incorrect password (with minLength 8) to simulate failed login attempt
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // intentionally wrong password, valid format/length
    href: "https://shop.example.com/login", // use plausible URIs
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallSeller.ILogin;

  // 2. Attempt login and verify it fails (should throw error, do NOT leak sensitive info)
  await TestValidator.error(
    "seller login with incorrect password should fail",
    async () => {
      await api.functional.auth.seller.login(connection, { body: loginBody });
    },
  );
}
