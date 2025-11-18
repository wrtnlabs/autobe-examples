import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify that seller login rejects an incorrect password for an existing seller
 * account.
 *
 * Business purpose:
 *
 * - Ensure that the seller authentication flow enforces credential correctness.
 * - Confirm that an attacker cannot obtain tokens by guessing a wrong password
 *   even when the email is valid.
 * - Ensure that the API surface does not leak token information through a
 *   successful login response on failed credentials.
 *
 * High-level steps:
 *
 * 1. Register a new seller via /auth/seller/join with a random email and a known
 *    valid password.
 * 2. Attempt to log in via /auth/seller/login using the same email but an
 *    intentionally incorrect password while still providing valid href and
 *    referrer values.
 * 3. Assert that the login attempt fails by throwing an HttpError using
 *    TestValidator.error.
 *
 * Notes and constraints:
 *
 * - Use IShoppingMallSellerAuthJoin.IRequest as the request DTO for join and
 *   IShoppingMallSellerAuthLogin.IRequest for login.
 * - Do not rely on any specific HTTP status code or error message; only the fact
 *   that the call fails is asserted.
 * - Since internal session tables and headers are not part of the permitted
 *   surface for this test, we only verify behavior via the error outcome.
 */
export async function test_api_seller_login_rejects_invalid_password(
  connection: api.IConnection,
) {
  // 1. Register a new seller with a known password
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequest,
    });
  typia.assert(joinedSeller);

  // 2. Build login request with same email but wrong password
  const wrongPassword = `${joinRequest.password}#wrong`;
  const loginRequest = {
    email: joinRequest.email,
    password: wrongPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  // 3. Assert that login with invalid password fails
  await TestValidator.error(
    "seller login with incorrect password must fail",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: loginRequest,
      });
    },
  );
}
