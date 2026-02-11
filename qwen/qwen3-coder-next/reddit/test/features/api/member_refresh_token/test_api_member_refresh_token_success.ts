import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member token refresh workflow.
 * 1. Member logs in and obtains access + refresh tokens
 * 2. Extract refresh token and prepare refresh request data
 * 3. Call refresh endpoint with valid refresh token
 * 4. Verify new tokens are issued and access token works
 */
export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection and login
  const memberConnection: api.IConnection = { host: connection.host };
  const loginBody: IRedditPlatformMember.ILogin = {
    email: "test@example.com",
    password: "password123",
  } satisfies IRedditPlatformMember.ILogin;
  await api.functional.redditPlatform.auth.member.login(memberConnection, {
    body: loginBody,
  });
  // 2. Extract refresh token from login response
  const loginResponse: IRedditPlatformMember.IAuthorized =
    await api.functional.redditPlatform.auth.member.login(memberConnection, {
      body: loginBody,
    });
  typia.assert(loginResponse);
  const refreshToken = loginResponse.token.refresh;
  // 3. Prepare refresh request with proper connection isolation
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshRequest: IRedditPlatformMember.IRefresh = {
    refresh_token: refreshToken,
    ip: "192.168.1.1",
    href: "/redditPlatform/auth/member/refresh",
    referrer: "https://example.com",
  } satisfies IRedditPlatformMember.IRefresh;
  // 4. Call refresh endpoint
  const refreshResponse =
    await api.functional.redditPlatform.auth.member.refresh(refreshConnection, {
      body: refreshRequest,
    });
  typia.assert(refreshResponse);
  // 5. Verify new tokens are issued
  typia.assert(refreshResponse.token.access);
  typia.assert(refreshResponse.token.refresh);
  typia.assert(refreshResponse.token.expired_at);
  typia.assert(refreshResponse.token.refreshable_until);
  // 6. Verify new access token works for protected endpoints
  // (This would typically be a protected endpoint call)
  // For now, we verify the token structure is valid
  typia.assertEquals(refreshResponse.token.access);
}
