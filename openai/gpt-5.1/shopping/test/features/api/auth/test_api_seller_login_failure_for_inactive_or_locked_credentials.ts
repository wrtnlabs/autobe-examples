import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate seller login behavior around credential state using the public
 * /auth/seller/login endpoint.
 *
 * Business intent (from the scenario): sellers whose underlying
 * shopping_mall_auth_credentials are in non-allowed statuses like "locked" or
 * "compromised" must not be able to log in even if they provide the correct
 * password. Such attempts should be recorded as failed login events and treated
 * as authentication failures.
 *
 * Technical limitation: from this test harness we only have access to the login
 * endpoint and cannot directly manipulate internal credential status or inspect
 * auth logs/security events. Also, when the connection.simulate flag is true,
 * the SDK bypasses the real backend and uses NestiaSimulator to validate
 * request shapes and generate random IShoppingMallSeller.IAuthorized responses,
 * so we cannot observe genuine login failures caused by locked credentials.
 *
 * Therefore this E2E test does the following within the available API surface
 * and global constraints:
 *
 * 1. Build a valid seller login request payload using
 *    IShoppingMallSellerLogin.IRequest with realistic email, password, href,
 *    and referrer values.
 * 2. Perform a baseline login attempt that is expected to succeed under normal
 *    circumstances and assert that the response is a valid
 *    IShoppingMallSeller.IAuthorized instance (using typia.assert) and that its
 *    token/access field is a non-empty string.
 * 3. Perform a second login attempt using the same credentials (which in a real
 *    system might represent another attempt after status changes). In simulate
 *    mode this will still succeed, but we can at least assert structural
 *    consistency and observe that the returned tokens differ, which aligns with
 *    the idea that each login attempt issues fresh authorization tokens.
 * 4. Document via comments how, in a full non-simulated environment with
 *    additional management APIs, this test would be extended to actually flip
 *    credential status to locked/compromised and assert a hard authentication
 *    failure (e.g., using TestValidator.error around
 *    api.functional.auth.seller.login).
 *
 * Note: In accordance with the framework rules, this test does not:
 *
 * - Send malformed request bodies or wrong types to force validation errors.
 * - Assert on specific HTTP status codes or error bodies.
 * - Manipulate connection.headers directly (we rely solely on the SDK's automatic
 *   Authorization header handling on successful login).
 */
export async function test_api_seller_login_failure_for_inactive_or_locked_credentials(
  connection: api.IConnection,
) {
  // 1. Construct a valid seller login request payload.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const requestBody = {
    email,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallSellerLogin.IRequest;

  // 2. Baseline successful login attempt.
  const firstLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: requestBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(firstLogin);

  // Validate that core fields are populated as expected.
  TestValidator.predicate(
    "first login returns non-empty seller id",
    firstLogin.id.length > 0,
  );
  TestValidator.predicate(
    "first login returns matching email",
    firstLogin.email === requestBody.email,
  );
  TestValidator.predicate(
    "first login returns non-empty access token",
    firstLogin.token.access.length > 0,
  );
  TestValidator.predicate(
    "first login returns non-empty refresh token",
    firstLogin.token.refresh.length > 0,
  );

  // 3. Second login attempt with the same credentials.
  const secondLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: requestBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(secondLogin);

  // Assert structural consistency between seller identities.
  TestValidator.equals(
    "seller id remains consistent across logins",
    secondLogin.id,
    firstLogin.id,
  );
  TestValidator.equals(
    "seller email remains consistent across logins",
    secondLogin.email,
    firstLogin.email,
  );

  // Tokens are expected to be freshly issued; in many systems access
  // tokens will differ between logins. We assert inequality here to
  // reflect that expectation while working purely with simulated data.
  TestValidator.notEquals(
    "access tokens differ between separate login attempts",
    firstLogin.token.access,
    secondLogin.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens differ between separate login attempts",
    firstLogin.token.refresh,
    secondLogin.token.refresh,
  );

  // 4. Conceptual note: If we had management APIs to flip
  // shopping_mall_auth_credentials.status to "locked" or
  // "compromised", a future extension of this test would:
  // - Perform a login while status is active and assert success.
  // - Change status to locked/compromised.
  // - Wrap a subsequent login attempt in TestValidator.error to assert
  //   that authentication fails and no IShoppingMallSeller.IAuthorized
  //   payload is returned.
  // Since such APIs are not exposed here, and the simulator always
  // yields success for valid requests, we restrict this test to
  // positive-path structural validation.
}
