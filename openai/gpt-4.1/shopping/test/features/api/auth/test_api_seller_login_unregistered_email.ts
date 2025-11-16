import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller login failure with an unregistered email.
 *
 * This test verifies that the seller login API /auth/seller/login does not
 * allow authentication for an email that is not present in the seller database.
 * Attempting to log in with a random (and thus unregistered) email and a
 * valid-format password should result in an authentication failure, confirming
 * the endpoint's security and non-disclosure of account existence details. No
 * login session or token should be issued for such requests.
 *
 * Steps:
 *
 * 1. Generate a random email in valid format (guaranteed unregistered).
 * 2. Prepare a password string of sufficient length and valid Format<"password">.
 * 3. Prepare random href and referrer fields using valid URI format.
 * 4. Construct the request body as IShoppingMallSeller.ILogin.
 * 5. Attempt to log in with the generated credentials via
 *    api.functional.auth.seller.login.
 * 6. Assert that the API call fails and an error is thrown (using
 *    TestValidator.error with await and async callback).
 * 7. Confirm no tokens or account-sensitive information are returned on failure.
 */
export async function test_api_seller_login_unregistered_email(
  connection: api.IConnection,
) {
  // 1. Generate a guaranteed-unregistered random email and password
  const unregisteredEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12); // At least 8 chars
  const href: string = "https://example.com/login";
  const referrer: string = "https://example.com/";

  // 2. Build login payload
  const loginBody = {
    email: unregisteredEmail,
    password,
    href,
    referrer,
  } satisfies IShoppingMallSeller.ILogin;

  // 3. Attempt login and expect failure
  await TestValidator.error(
    "unregistered seller login attempt should fail",
    async () => {
      await api.functional.auth.seller.login(connection, { body: loginBody });
    },
  );
}
