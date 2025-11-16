import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate successful token refresh for a member user.
 *
 * Business goal: Ensure that a community platform member user, who already has
 * a valid session and refresh token, can obtain a fresh access/refresh token
 * bundle using POST /auth/memberUser/refresh without re-supplying credentials.
 * The test verifies token rotation and identity stability.
 *
 * High-level flow:
 *
 * 1. Join: create a new member user account using
 *    ICommunityPlatformMemberuser.IJoinRequest.
 * 2. Login: authenticate the user with ICommunityPlatformMemberuser.ILoginRequest
 *    to get an initial IAuthorized envelope.
 * 3. Refresh: call ICommunityPlatformMemberuser.IRefreshRequest using the previous
 *    token.refresh as refresh_token.
 * 4. Validate: ensure returned IAuthorized has rotated tokens and stable identity.
 */
export async function test_api_member_user_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Join: create a new member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    // Optional ip can be omitted or set to null; we choose to omit it.
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const joined: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Login: authenticate the same user using email+password
  const loginBody = {
    identifier: joinBody.email,
    password: joinBody.password,
    href: "https://example.com/login" as string & tags.Format<"uri">,
    referrer: "https://example.com/join-success" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const loggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Prepare refresh request using the canonical token.refresh value
  const refreshToken: string = loggedIn.token.refresh;

  const refreshBody = {
    refresh_token: refreshToken,
  } satisfies ICommunityPlatformMemberuser.IRefreshRequest;

  const beforeToken: IAuthorizationToken = loggedIn.token;

  // 4. Call refresh endpoint
  const refreshed: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  const afterToken: IAuthorizationToken = refreshed.token;

  // 5. Verify identity stability
  TestValidator.equals(
    "refreshed user id should match original login id",
    refreshed.id,
    loggedIn.id,
  );
  TestValidator.equals(
    "refreshed username should match original login username",
    refreshed.username,
    loggedIn.username,
  );
  TestValidator.equals(
    "refreshed email should match original login email",
    refreshed.email,
    loggedIn.email,
  );
  TestValidator.equals(
    "refreshed statusCode should match original login statusCode",
    refreshed.statusCode,
    loggedIn.statusCode,
  );
  if (loggedIn.accountStatusKey !== undefined) {
    TestValidator.equals(
      "refreshed accountStatusKey should match when original key is defined",
      refreshed.accountStatusKey,
      loggedIn.accountStatusKey,
    );
  }

  // 6. Verify token rotation: at least access token should change
  TestValidator.notEquals(
    "access token should rotate on refresh",
    afterToken.access,
    beforeToken.access,
  );
  TestValidator.notEquals(
    "refresh token should rotate on refresh",
    afterToken.refresh,
    beforeToken.refresh,
  );

  // 7. Verify token expiry fields are in the future
  const now: number = Date.now();
  const expiredAtMs: number = new Date(afterToken.expired_at).getTime();
  const refreshableUntilMs: number = new Date(
    afterToken.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "access token expired_at must be in the future",
    expiredAtMs > now,
  );
  TestValidator.predicate(
    "refresh token refreshable_until must be in the future",
    refreshableUntilMs > now,
  );
}
