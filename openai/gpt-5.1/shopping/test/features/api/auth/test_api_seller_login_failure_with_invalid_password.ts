import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that seller login fails when invalid credentials are supplied.
 *
 * Business intent:
 *
 * - Ensure that authentication does not succeed when a seller submits an
 *   incorrect email/password combination.
 * - Confirm that, on failure, the caller does not obtain an
 *   `IShoppingMallSeller.IAuthorized` session object or any access/refresh
 *   tokens.
 *
 * Test approach:
 *
 * 1. Construct a type-safe `IShoppingMallSellerLogin.IRequest` body using random
 *    but valid-shaped values (email, password, href, referrer).
 * 2. Call `POST /auth/seller/login` via `api.functional.auth.seller.login` with
 *    the request body.
 * 3. Wrap the call with `TestValidator.error` to assert that the authentication
 *    attempt fails and throws, rather than returning a successful
 *    `IShoppingMallSeller.IAuthorized` response.
 *
 * Notes:
 *
 * - We do not rely on concrete seeded seller credentials; instead, we focus on
 *   verifying that an arbitrary invalid credential set does not produce a
 *   successful login.
 * - We do not assert on HTTP status codes or error payload details, only that an
 *   error is thrown.
 */
export async function test_api_seller_login_failure_with_invalid_password(
  connection: api.IConnection,
) {
  // 1. Prepare a login payload with invalid credentials
  const requestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  // 2. Attempt login and expect failure
  await TestValidator.error(
    "seller login with invalid credentials must fail",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: requestBody,
      });
    },
  );
}
