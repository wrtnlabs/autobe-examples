import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate community platform memberUser login success and failure behaviors
 * using only the available join and login endpoints.
 *
 * Original intent: ensure that member users whose accounts are banned or
 * suspended cannot authenticate even with valid credentials, while normal users
 * can. However, because the public SDK surface here does not expose any
 * administrative endpoint for toggling `is_suspended` or `is_banned`, this test
 * focuses on what _can_ be validated reliably:
 *
 * - Successful login for freshly joined accounts where the status flags are
 *   expected to be non-restricted.
 * - Authentication failure when using an incorrect password, proving that the
 *   login endpoint enforces credential checks and produces proper errors for
 *   invalid attempts.
 *
 * The test performs the following high-level steps:
 *
 * 1. Register the first member user via POST /auth/memberUser/join.
 *
 *    - Use randomly generated but valid username, email, and password.
 *    - Explicitly set `ip` to null while providing valid `href` and `referrer` URIs.
 *    - Assert that the response conforms to IAuthorized and that `is_suspended` and
 *         `is_banned` are false for a fresh account.
 * 2. Perform a successful login for the first user via POST /auth/memberUser/login
 *    using `identifier = username` and the correct password.
 *
 *    - Assert response type with typia.assert.
 *    - Assert that the logged-in member id matches the account created by the join
 *         step.
 *    - Assert again that the account is not suspended or banned, and that a
 *         non-empty token bundle is present.
 * 3. Attempt a login for the first user with an incorrect password.
 *
 *    - Call the same login endpoint with the same identifier but a different
 *         password string of valid shape.
 *    - Wrap the call in TestValidator.error to assert that the attempt fails with an
 *         authentication-style error (without inspecting HTTP status codes).
 * 4. Register a second member user via POST /auth/memberUser/join.
 *
 *    - This user conceptually represents a separate account which is not under any
 *         restriction.
 *    - Assert again that join returns IAuthorized with `is_suspended === false` and
 *         `is_banned === false`.
 * 5. Perform a successful login for the second user using username-based
 *    identifier and correct password, asserting the same invariants as in step
 *    2.
 *
 * Although this test cannot directly flip `is_suspended` or `is_banned` due to
 * the absence of admin-level APIs in the provided SDK, it still validates the
 * critical parts of the memberUser authentication flow that are observable from
 * the public surface: normal accounts can log in and incorrect passwords are
 * rejected. The status flags are verified to be in a non-restricted state at
 * each successful authentication boundary.
 */
export async function test_api_memberuser_login_denied_for_banned_or_suspended_account(
  connection: api.IConnection,
) {
  // Helper to generate a valid password meeting MinLength<8>
  const generatePassword = () => RandomGenerator.alphaNumeric(12);

  // 1. Register the first (baseline) member user account via join
  const username1: string = RandomGenerator.name(1);
  const email1: string = typia.random<string & tags.Format<"email">>();
  const password1: string = generatePassword();

  const joinBody1 = {
    username: username1,
    email: email1,
    password: password1,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const joined1: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody1,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(joined1);

  TestValidator.predicate(
    "freshly joined user #1 should not be suspended or banned",
    joined1.is_suspended === false && joined1.is_banned === false,
  );

  // 2. Successful login for the first user with correct credentials
  const loginBody1 = {
    identifier: username1,
    password: password1,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const loggedIn1: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody1,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(loggedIn1);

  TestValidator.equals(
    "login #1 should return the same member id as the join response",
    loggedIn1.id,
    joined1.id,
  );

  TestValidator.predicate(
    "logged-in user #1 should still not be suspended or banned",
    loggedIn1.is_suspended === false && loggedIn1.is_banned === false,
  );

  TestValidator.predicate(
    "login #1 should provide a non-empty access token",
    loggedIn1.token.access.length > 0,
  );

  TestValidator.predicate(
    "login #1 should provide a non-empty refresh token",
    loggedIn1.token.refresh.length > 0,
  );

  // 3. Attempt login with incorrect password for user #1 and expect failure
  const wrongPassword1: string = generatePassword() + "x";

  const badLoginBody1 = {
    identifier: username1,
    password: wrongPassword1,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILogin;

  await TestValidator.error(
    "login with wrong password for user #1 should fail",
    async () => {
      await api.functional.auth.memberUser.login(connection, {
        body: badLoginBody1,
      });
    },
  );

  // 4. Register a second (independent) member user account via join
  const username2: string = RandomGenerator.name(1);
  const email2: string = typia.random<string & tags.Format<"email">>();
  const password2: string = generatePassword();

  const joinBody2 = {
    username: username2,
    email: email2,
    password: password2,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const joined2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody2,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(joined2);

  TestValidator.predicate(
    "freshly joined user #2 should not be suspended or banned",
    joined2.is_suspended === false && joined2.is_banned === false,
  );

  // 5. Successful login for the second user with correct credentials
  const loginBody2 = {
    identifier: username2,
    password: password2,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const loggedIn2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody2,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(loggedIn2);

  TestValidator.equals(
    "login #2 should return the same member id as the join response",
    loggedIn2.id,
    joined2.id,
  );

  TestValidator.predicate(
    "logged-in user #2 should still not be suspended or banned",
    loggedIn2.is_suspended === false && loggedIn2.is_banned === false,
  );

  TestValidator.predicate(
    "login #2 should provide a non-empty access token",
    loggedIn2.token.access.length > 0,
  );

  TestValidator.predicate(
    "login #2 should provide a non-empty refresh token",
    loggedIn2.token.refresh.length > 0,
  );
}
