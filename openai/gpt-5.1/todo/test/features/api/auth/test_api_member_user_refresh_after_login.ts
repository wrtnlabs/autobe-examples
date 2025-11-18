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
 * Validate member user token refresh after a normal login.
 *
 * Business flow:
 *
 * 1. Self-register a new member user via /auth/memberUser/join with realistic
 *    connection metadata (href, referrer, ip) using
 *    ITodoAppMemberUserJoin.ICreate.
 * 2. Perform a credential-based login via /auth/memberUser/login using
 *    ITodoAppMemberUserLogin.ICreate with the same email/password and fresh
 *    connection metadata.
 * 3. Take the ITodoAppMemberUser.IAuthorized returned by login and build a
 *    ITodoAppMemberUserRefresh.ICreate payload using its refresh token plus
 *    additional connection metadata (href, referrer, ip).
 * 4. Call /auth/memberUser/refresh and obtain a new
 *    ITodoAppMemberUser.IAuthorized.
 * 5. Assert that identity fields (id, email, status, timestamps) are consistent
 *    where appropriate and that token-related fields have been rotated
 *    (different access/refresh tokens and expiry timestamps) while preserving a
 *    valid account status.
 */
export async function test_api_member_user_refresh_after_login(
  connection: api.IConnection,
) {
  // 1. Self-register a new member user
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);

  const joinHref = "https://app.todo.local/join" as const;
  const joinReferrer = "https://app.todo.local/landing" as const;
  const joinIp = typia.random<string & tags.Format<"ipv4">>();

  const joinBody = {
    email: joinEmail,
    password: joinPassword as string & tags.Format<"password">,
    displayName: RandomGenerator.name(2),
    ip: joinIp,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const joined = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoAppMemberUser.IAuthorized>(joined);

  // 2. Login with the same credentials
  const loginHref = "https://app.todo.local/login" as const;
  const loginReferrer = "https://app.todo.local/join" as const;
  const loginIp = "198.51.100.42";

  const loginBody = {
    email: joinEmail,
    password: joinPassword,
    ip: loginIp,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const loggedIn = await api.functional.auth.memberUser.login(connection, {
    body: loginBody,
  });
  typia.assert<ITodoAppMemberUser.IAuthorized>(loggedIn);

  // 3. Build refresh payload using login refresh token
  const refreshHref = "https://app.todo.local/refresh" as const;
  const refreshReferrer = loginHref;
  const refreshIp = "203.0.113.10";

  const refreshBody = {
    refresh_token: loggedIn.token.refresh,
    // session_id is optional and not exposed by any response DTO we have,
    // so we omit it here.
    ip: refreshIp,
    href: refreshHref,
    referrer: refreshReferrer,
  } satisfies ITodoAppMemberUserRefresh.ICreate;

  const refreshed = await api.functional.auth.memberUser.refresh(connection, {
    body: refreshBody,
  });
  typia.assert<ITodoAppMemberUser.IAuthorized>(refreshed);

  // 4. Identity consistency assertions
  TestValidator.equals(
    "member id should remain the same between login and refresh",
    refreshed.id,
    loggedIn.id,
  );

  TestValidator.equals(
    "member email should remain the same between login and refresh",
    refreshed.email,
    loggedIn.email,
  );

  TestValidator.equals(
    "member status should remain the same between login and refresh",
    refreshed.status,
    loggedIn.status,
  );

  // 5. Token rotation assertions
  const loginToken: IAuthorizationToken = loggedIn.token;
  const refreshToken: IAuthorizationToken = refreshed.token;

  TestValidator.notEquals(
    "access token should be rotated on refresh",
    refreshToken.access,
    loginToken.access,
  );

  TestValidator.notEquals(
    "refresh token should be rotated on refresh when policy supports it",
    refreshToken.refresh,
    loginToken.refresh,
  );

  TestValidator.notEquals(
    "access token expiry should change after refresh",
    refreshToken.expired_at,
    loginToken.expired_at,
  );

  TestValidator.notEquals(
    "refresh token expiry window should change after refresh",
    refreshToken.refreshable_until,
    loginToken.refreshable_until,
  );
}
