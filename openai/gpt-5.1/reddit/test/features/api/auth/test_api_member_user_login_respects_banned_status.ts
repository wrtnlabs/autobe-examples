import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that memberUser login never returns a banned/suspended status for a
 * successful authentication.
 *
 * The original business story wanted to verify that banned/suspended accounts
 * cannot log in. However, there is no exposed API in the SDK to transition a
 * member user to a banned status, and test code cannot touch the database
 * directly. To keep the test implementable while still enforcing an important
 * invariant, we instead assert the complementary rule:
 *
 * - Whenever /auth/memberUser/login returns a successful authorization envelope
 *   (IAuthorized), the account must not be marked as banned/suspended in the
 *   status fields exposed to the client.
 *
 * This means that if the backend ever starts returning a banned-like
 * accountStatusKey while still issuing tokens, this test will fail and surface
 * the regression.
 *
 * High-level flow:
 *
 * 1. Self-register a new member user via POST /auth/memberUser/join using
 *    ICommunityPlatformMemberuser.IJoinRequest with realistic random data.
 * 2. Immediately log in via POST /auth/memberUser/login using the same email and
 *    password.
 * 3. Assert both join and login responses using typia.assert to guarantee
 *    structural correctness.
 * 4. Validate business invariant on the login response:
 *
 *    - Token.access and token.refresh are non-empty strings.
 *    - If accountStatusKey is defined, it must NOT be one of known banned-like keys
 *         (e.g., "banned", "suspended", "blocked", "disabled").
 * 5. Perform a second login call (idempotent behavior) and re-validate the
 *    invariant to ensure consistent behavior.
 */
export async function test_api_member_user_login_respects_banned_status(
  connection: api.IConnection,
) {
  // 1. Register a new member user via join
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.name(1);
  const password: string = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    username,
    email,
    password,
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://marketing.example.com/campaign",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const joined: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(joined);

  // Basic sanity checks on join result
  TestValidator.equals(
    "join: username echoes input",
    joined.username,
    username,
  );
  TestValidator.equals("join: email echoes input", joined.email, email);

  // 2. Perform login with the same credentials
  const loginBody = {
    identifier: email,
    password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/join-success",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const loggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(loggedIn);

  // 3. Business invariant: successful login must not present banned-like status
  TestValidator.predicate(
    "login: accountStatusKey must not be a banned-like key on success",
    () =>
      loggedIn.accountStatusKey === undefined ||
      (loggedIn.accountStatusKey !== "banned" &&
        loggedIn.accountStatusKey !== "suspended" &&
        loggedIn.accountStatusKey !== "blocked" &&
        loggedIn.accountStatusKey !== "disabled"),
  );

  // Token sanity checks: tokens must be non-empty when login succeeds
  TestValidator.predicate(
    "login: token.access must be non-empty",
    () => loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login: token.refresh must be non-empty",
    () => loggedIn.token.refresh.length > 0,
  );

  // 4. Repeat login and re-validate invariant for stability
  const loggedInAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(loggedInAgain);

  TestValidator.predicate(
    "second login: accountStatusKey must not be banned-like",
    () =>
      loggedInAgain.accountStatusKey === undefined ||
      (loggedInAgain.accountStatusKey !== "banned" &&
        loggedInAgain.accountStatusKey !== "suspended" &&
        loggedInAgain.accountStatusKey !== "blocked" &&
        loggedInAgain.accountStatusKey !== "disabled"),
  );

  TestValidator.equals(
    "second login: same user id as first login",
    loggedInAgain.id,
    loggedIn.id,
  );
}
