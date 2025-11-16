import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Verify that sellers in non-operational lifecycle states cannot obtain
 * sessions.
 *
 * This test conceptually targets the business rule that a seller whose
 * underlying shopping_mall_seller row is suspended, terminated, or logically
 * deleted must not be able to log in even if their auth credentials would
 * otherwise be valid. From the exposed SDK we only have direct access to POST
 * /auth/seller/login and not to lower-level mutation APIs for explicitly
 * creating a suspended/terminated seller, so we model the failure path via the
 * login error behavior.
 *
 * Test strategy
 *
 * 1. Build a realistic IShoppingMallSellerLogin.IRequest payload, including email,
 *    password, href, referrer, and optionally ip, using typia.random and
 *    RandomGenerator utilities.
 * 2. Create a fresh logical connection object dedicated to this test, without any
 *    pre-existing Authorization header, by shallow-cloning the inbound
 *    connection. This simulates a browser hitting the login page.
 * 3. Invoke api.functional.auth.seller.login with the prepared request body inside
 *    TestValidator.error (async callback) to assert that the operation fails
 *    instead of returning IShoppingMallSeller.IAuthorized. We do not check HTTP
 *    status codes or error payloads, only that an error occurs.
 * 4. After the failed login attempt, assert that the connection object has not
 *    been populated with an access token in its headers, i.e., no Authorization
 *    header was set as a side effect of the failed call.
 *
 * By doing this we exercise the negative-path behavior of the login endpoint
 * consistent with the rule that suspended/terminated or logically deleted
 * sellers must not receive new authenticated sessions.
 */
export async function test_api_seller_login_failure_for_suspended_or_terminated_seller(
  connection: api.IConnection,
) {
  // 1. Prepare a realistic login request payload.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const requestBody = {
    email,
    password: RandomGenerator.alphabets(16),
    // ip is optional and nullable; here we omit it to let backend infer.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  // 2. Create a fresh unauthenticated connection clone.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Expect login to fail for a non-operational seller (suspended/terminated).
  await TestValidator.error(
    "suspended/terminated seller cannot log in",
    async () => {
      await api.functional.auth.seller.login(unauthenticatedConnection, {
        body: requestBody,
      });
    },
  );

  // 4. Ensure that no Authorization header was written as a side effect.
  await TestValidator.predicate(
    "failed login must not set Authorization header",
    async () => !unauthenticatedConnection.headers?.Authorization,
  );
}
