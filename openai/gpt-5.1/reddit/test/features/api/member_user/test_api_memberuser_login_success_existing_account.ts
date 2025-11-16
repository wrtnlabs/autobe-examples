import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate successful login for an existing community platform member user.
 *
 * Business goals:
 *
 * - Ensure that a member user who has just joined can immediately log in using
 *   the username as the identifier.
 * - Confirm that the login response returns an IAuthorized view referring to the
 *   same account as the join response.
 * - Verify that security counters (failed_login_count / locked_until) reflect a
 *   successful login by being reset to an unlocked, non-failing state.
 * - Verify that a fresh IAuthorizationToken bundle is issued on login and has
 *   structurally valid and non-empty fields with future expiration timestamps.
 *
 * Scenario steps:
 *
 * 1. Join: register a new member user via POST /auth/memberUser/join with a random
 *    username/email/password and realistic href/referrer context.
 * 2. Login: call POST /auth/memberUser/login using the username as the identifier,
 *    the same password, and new href/referrer/ip context.
 * 3. Compare identities: ensure that id, username, and email from login match the
 *    values from join.
 * 4. Validate lockout state: failed_login_count === 0 and locked_until === null
 *    (or effectively no lockout) after successful login.
 * 5. Validate token bundle: token.access and token.refresh are non-empty strings,
 *    and expired_at / refreshable_until are valid ISO date-time strings in the
 *    future relative to now.
 */
export async function test_api_memberuser_login_success_existing_account(
  connection: api.IConnection,
) {
  // 1. Create a baseline member user account via join
  const password: string = RandomGenerator.alphabets(12);
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password,
    // leave ip undefined so that the server can infer it from transport
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const joined: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(joined);

  // 2. Login using username as identifier with the same password
  const loginBody = {
    identifier: joinBody.username,
    password,
    // supply explicit ip context and new href/referrer
    ip: "192.0.2.10",
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/posts/123",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const loggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(loggedIn);

  // 3. Confirm the same account identity between join and login
  TestValidator.equals(
    "login should return same member id as join",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "login should return same username as join",
    loggedIn.username,
    joined.username,
  );
  TestValidator.equals(
    "login should return same email as join",
    loggedIn.email,
    joined.email,
  );

  // 4. Verify lockout counters were reset on successful login
  await TestValidator.predicate(
    "failed_login_count must be zero after successful login",
    async () => loggedIn.failed_login_count === 0,
  );
  TestValidator.equals(
    "locked_until must be null or undefined (no active lockout) after successful login",
    loggedIn.locked_until ?? null,
    null,
  );

  // 5. Validate token structure and temporal semantics
  const token: IAuthorizationToken = loggedIn.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token must be non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be non-empty string",
    token.refresh.length > 0,
  );

  const nowMs: number = Date.now();
  const accessExpiresMs: number = new Date(token.expired_at).getTime();
  const refreshableUntilMs: number = new Date(
    token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "access token expiration must be in the future",
    accessExpiresMs > nowMs,
  );
  TestValidator.predicate(
    "refresh token expiration must be on or after access expiration",
    refreshableUntilMs >= accessExpiresMs,
  );
}
