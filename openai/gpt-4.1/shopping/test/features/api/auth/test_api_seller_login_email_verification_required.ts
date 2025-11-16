import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that seller login fails when email verification has not been completed.
 *
 * 1. Construct a login DTO with random credentials (valid email, password, href,
 *    referrer).
 * 2. (Assume in test infra: This seller exists, but their is_email_verified is
 *    false.)
 * 3. Call api.functional.auth.seller.login using the credentials.
 * 4. Confirm that the login attempt fails (rejects) as the business rule requires
 *    email verification for authentication.
 * 5. No other seller/account information should be returned on failure.
 */
export async function test_api_seller_login_email_verification_required(
  connection: api.IConnection,
) {
  // 1. Prepare valid credentials for a seller whose email is not verified
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: "https://shoppingmall.com/seller-login",
    referrer: "https://shoppingmall.com/onboarding",
  } satisfies IShoppingMallSeller.ILogin;

  // 2. Attempt login and expect failure due to unverified email
  await TestValidator.error(
    "seller login with unverified email should be rejected",
    async () => {
      await api.functional.auth.seller.login(connection, { body: loginBody });
    },
  );
}
