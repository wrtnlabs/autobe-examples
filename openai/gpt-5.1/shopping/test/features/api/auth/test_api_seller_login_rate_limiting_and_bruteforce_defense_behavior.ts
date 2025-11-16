import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that repeated seller login failures never yield an authorized
 * session.
 *
 * Business goal:
 *
 * - Guard seller accounts against brute-force attempts by ensuring that invalid
 *   credentials never succeed, even under repeated attempts, and that the API
 *   consistently fails authentication.
 *
 * Practical constraints:
 *
 * - We have only one visible API: POST /auth/seller/login
 *   (api.functional.auth.seller.login) with body
 *   IShoppingMallSellerLogin.IRequest and response
 *   IShoppingMallSeller.IAuthorized.
 * - There are no visible admin or analytics APIs to inspect
 *   shopping_mall_auth_logs or shopping_mall_security_events.
 * - We must not manipulate connection.headers directly and must not assert on
 *   specific HTTP status codes.
 * - We cannot create a real seller in this test because no join/signup API is
 *   provided in the materials, so we cannot test the transition from failure to
 *   success for the same email here.
 *
 * Therefore this test focuses on the negative side of the brute-force defense:
 *
 * - Perform multiple consecutive login attempts using an email/password
 *   combination that is guaranteed to be invalid for any real seller account.
 * - For each attempt, assert that the login call throws (i.e.,
 *   TestValidator.error is satisfied) and that a successful
 *   IShoppingMallSeller.IAuthorized object is never produced.
 * - Use realistic but obviously synthetic session context: valid email format,
 *   valid href/referrer URIs, and an optional ip set to a plausible IPv4
 *   string.
 * - Simulate a small burst of repeated attempts from the same client context.
 *
 * Because the internals of rate limiting and security event logging are not
 * exposed via public APIs, we treat the consistent failure behavior itself as
 * the observable guardrail: even if there is rate limiting or account locking
 * under the hood, any such mechanism must not produce a successful
 * IShoppingMallSeller.IAuthorized response when credentials are invalid.
 */
export async function test_api_seller_login_rate_limiting_and_bruteforce_defense_behavior(
  connection: api.IConnection,
) {
  // Use a deterministic but clearly synthetic seller email that should not
  // correspond to any real account. Even if it did, the password will not
  // match because it is a random string.
  const invalidEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // Use a single wrong password and reuse it across attempts to simulate a
  // brute-force attacker reusing the same guessed credential.
  const wrongPassword: string = RandomGenerator.alphaNumeric(32);

  // Construct stable session context: a login page URL and a referrer. These
  // must be valid URIs to satisfy IShoppingMallSellerLogin.IRequest.
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  // Optional ip field: provide a plausible IPv4 string to mimic a single
  // attacking client. We rely on typia.random with ipv4 format.
  const ip: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();

  // Decide how many attempts to simulate. Use a small burst (e.g., 6 attempts)
  // to represent repeated failures without prolonging test runtime.
  const attemptCount: number = 6;

  // For each attempt, call the login API with invalid credentials and assert
  // that it throws. If any call unexpectedly succeeds and returns an
  // IShoppingMallSeller.IAuthorized value, TestValidator.error will fail the
  // test.
  await ArrayUtil.asyncRepeat(attemptCount, async (index) => {
    await TestValidator.error(
      `seller login with invalid credentials must fail on attempt #${index + 1}`,
      async () => {
        // Each iteration sends the same invalid credentials and context to
        // mimic a brute-force pattern from a single IP/browser.
        await api.functional.auth.seller.login(connection, {
          body: {
            email: invalidEmail,
            password: wrongPassword,
            ip,
            href,
            referrer,
          } satisfies IShoppingMallSellerLogin.IRequest,
        });
      },
    );
  });
}
