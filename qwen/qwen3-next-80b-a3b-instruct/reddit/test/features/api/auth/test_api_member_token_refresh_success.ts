import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create a fresh member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";
  const href = "https://community-platform.com/join";
  const referrer = "https://community-platform.com";
  const ip = "192.168.1.100";

  const joinResult: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href,
        referrer,
        ip,
      } satisfies IMember.ICreate,
    });
  typia.assert(joinResult);

  // Step 2: Extract refresh token from join result
  const refresh_token = joinResult.token.refresh;

  // Step 3: Use refresh token to obtain new access token
  const refreshResult: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token,
      } satisfies IMember.IRefresh,
    });
  typia.assert(refreshResult);

  // Step 4: Validate refresh result
  TestValidator.equals(
    "email remains unchanged after refresh",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "member id remains unchanged after refresh",
    refreshResult.id,
    joinResult.id,
  );
  TestValidator.notEquals(
    "new access token is different from original",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.equals(
    "refresh token remains unchanged after refresh",
    refreshResult.token.refresh,
    joinResult.token.refresh,
  );

  // Step 5: Validate expiration time
  const originalExpiredAt = new Date(joinResult.token.expired_at);
  const newExpiredAt = new Date(refreshResult.token.expired_at);
  const timeDifference = newExpiredAt.getTime() - originalExpiredAt.getTime();

  // Verify that expiration time is extended by approximately 15 minutes (900,000 ms)
  TestValidator.predicate(
    "new access token expired_at is extended by approximately 15 minutes",
    Math.abs(timeDifference - 900000) < 10000,
  ); // Allow 10 second tolerance for clock drift

  // Verify refreshable_until timestamp is within expected bounds
  const refreshableUntil = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until timestamp is within valid range",
    refreshableUntil > new Date() &&
      refreshableUntil < new Date(Date.now() + 86400000),
  ); // Within next 24 hours
}
