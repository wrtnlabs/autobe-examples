import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserRefresh";

/**
 * Validate refresh token behavior after multiple logins for the same member
 * user.
 *
 * Business goal
 *
 * - Ensure that a single member user can log in multiple times (e.g., different
 *   devices) and then successfully use refresh tokens obtained from each login,
 *   without breaking the authentication contract.
 * - Confirm that refresh tokens are structurally valid and that refreshed
 *   sessions always represent the same member identity.
 *
 * High-level flow
 *
 * 1. Join a member user with stable email/password and connection metadata.
 * 2. Perform first login with one set of metadata (href/referrer/ip).
 * 3. Perform second login with a different set of metadata.
 * 4. Capture refresh tokens from both login responses.
 * 5. Call refresh using the first refresh token.
 * 6. Call refresh using the second refresh token.
 * 7. Validate identity consistency and token temporal properties across all
 *    responses.
 */
export async function test_api_member_user_refresh_after_multiple_logins(
  connection: api.IConnection,
) {
  // 1. Join a member user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email,
    password,
    displayName: RandomGenerator.name(),
    // Use IPv4-compatible string here; it still satisfies the union on ip.
    ip: "127.0.0.1",
    href: "https://todoapp.example.com/signup",
    referrer: "https://todoapp.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const joined: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  const memberId = joined.id;
  const memberEmail = joined.email;
  const memberStatus = joined.status;

  // 2. First login with one set of metadata
  const loginBody1 = {
    email,
    password,
    ip: "192.168.0.10",
    href: "https://todoapp.example.com/login?device=primary",
    referrer: "https://todoapp.example.com/home",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const login1: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody1,
    });
  typia.assert(login1);

  const firstRefresh: string = login1.token.refresh;

  // 3. Second login with different metadata
  const loginBody2 = {
    email,
    password,
    ip: "10.0.0.20",
    href: "https://m.todoapp.example.com/login?device=secondary",
    referrer: "https://m.todoapp.example.com/home",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const login2: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody2,
    });
  typia.assert(login2);

  const secondRefresh: string = login2.token.refresh;

  // Optional structural check: they may or may not differ; ensure non-empty
  TestValidator.predicate(
    "first refresh token should be non-empty",
    firstRefresh.length > 0,
  );
  TestValidator.predicate(
    "second refresh token should be non-empty",
    secondRefresh.length > 0,
  );

  // 4. Refresh with firstRefresh
  const refreshBody1 = {
    refresh_token: firstRefresh,
    // leave session_id undefined to allow server-side correlation
    ip: "203.0.113.5",
    href: "https://todoapp.example.com/refresh?token=first",
    referrer: "https://todoapp.example.com/app",
  } satisfies ITodoAppMemberUserRefresh.ICreate;

  const refreshed1: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: refreshBody1,
    });
  typia.assert(refreshed1);

  // Identity consistency for refreshed1
  TestValidator.equals(
    "refreshed1 id matches original member id",
    refreshed1.id,
    memberId,
  );
  TestValidator.equals(
    "refreshed1 email matches original member email",
    refreshed1.email,
    memberEmail,
  );
  TestValidator.equals(
    "refreshed1 status matches original member status",
    refreshed1.status,
    memberStatus,
  );

  const token1: IAuthorizationToken = refreshed1.token;
  typia.assert(token1);

  // 5. Refresh with secondRefresh
  const refreshBody2 = {
    refresh_token: secondRefresh,
    ip: "203.0.113.25",
    href: "https://todoapp.example.com/refresh?token=second",
    referrer: "https://todoapp.example.com/app",
  } satisfies ITodoAppMemberUserRefresh.ICreate;

  const refreshed2: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: refreshBody2,
    });
  typia.assert(refreshed2);

  // Identity consistency for refreshed2
  TestValidator.equals(
    "refreshed2 id matches original member id",
    refreshed2.id,
    memberId,
  );
  TestValidator.equals(
    "refreshed2 email matches original member email",
    refreshed2.email,
    memberEmail,
  );
  TestValidator.equals(
    "refreshed2 status matches original member status",
    refreshed2.status,
    memberStatus,
  );

  const token2: IAuthorizationToken = refreshed2.token;
  typia.assert(token2);

  // Validate that expiration-related fields are monotonic or at least not earlier.
  const joinedAccessExpires = new Date(joined.token.expired_at).getTime();
  const login1AccessExpires = new Date(login1.token.expired_at).getTime();
  const login2AccessExpires = new Date(login2.token.expired_at).getTime();
  const refresh1AccessExpires = new Date(token1.expired_at).getTime();
  const refresh2AccessExpires = new Date(token2.expired_at).getTime();

  TestValidator.predicate(
    "login1 access token expiration should be no earlier than joined access token expiration",
    login1AccessExpires >= joinedAccessExpires,
  );
  TestValidator.predicate(
    "login2 access token expiration should be no earlier than login1 access token expiration",
    login2AccessExpires >= login1AccessExpires,
  );
  TestValidator.predicate(
    "refresh1 access token expiration should be no earlier than login1 access token expiration",
    refresh1AccessExpires >= login1AccessExpires,
  );
  TestValidator.predicate(
    "refresh2 access token expiration should be no earlier than login2 access token expiration",
    refresh2AccessExpires >= login2AccessExpires,
  );

  // Also confirm refresh window fields are valid and not in the past relative to access expiry.
  const joinedRefreshable = new Date(joined.token.refreshable_until).getTime();
  const login1Refreshable = new Date(login1.token.refreshable_until).getTime();
  const login2Refreshable = new Date(login2.token.refreshable_until).getTime();
  const refresh1Refreshable = new Date(token1.refreshable_until).getTime();
  const refresh2Refreshable = new Date(token2.refreshable_until).getTime();

  TestValidator.predicate(
    "joined refresh window should be no earlier than joined access expiry",
    joinedRefreshable >= joinedAccessExpires,
  );
  TestValidator.predicate(
    "login1 refresh window should be no earlier than login1 access expiry",
    login1Refreshable >= login1AccessExpires,
  );
  TestValidator.predicate(
    "login2 refresh window should be no earlier than login2 access expiry",
    login2Refreshable >= login2AccessExpires,
  );
  TestValidator.predicate(
    "refresh1 refresh window should be no earlier than refresh1 access expiry",
    refresh1Refreshable >= refresh1AccessExpires,
  );
  TestValidator.predicate(
    "refresh2 refresh window should be no earlier than refresh2 access expiry",
    refresh2Refreshable >= refresh2AccessExpires,
  );
}
