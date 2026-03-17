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
 * Test the primary success path for member token refresh.
 *
 * This test validates that:
 * 1. A registered member can successfully refresh their authentication tokens
 * 2. The refresh endpoint validates the refresh token correctly
 * 3. New access and refresh tokens are generated with proper expiration
 * 4. Token rotation occurs (old refresh token is invalidated)
 * 5. Member profile information is returned correctly
 * 6. Response structure matches IRedditPlatformMember.IAuthorized type
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member to obtain initial authentication tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(joinResult);
  // Step 2: Verify initial tokens are present
  TestValidator.predicate(
    "join returns access token",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "join returns refresh token",
    joinResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "join returns expiresAt",
    joinResult.expiresAt.length > 0,
  );
  // Store the original refresh token to verify rotation later
  const originalRefreshToken: string = joinResult.token.refresh;
  // Step 3: Wait a moment to ensure timestamp difference (optional, for realism)
  // In actual E2E, this could be skipped, but it simulates real usage
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 4: Refresh the authentication tokens using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult: IRedditPlatformMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refresh: originalRefreshToken,
      } satisfies IRedditPlatformMember.IRefresh,
    });
  typia.assert(refreshResult);
  // Step 5: Verify refresh response structure and content
  TestValidator.equals("member id preserved", refreshResult.id, joinResult.id);
  TestValidator.equals(
    "username preserved",
    refreshResult.username,
    joinResult.username,
  );
  TestValidator.equals(
    "email preserved",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.predicate(
    "karma score is valid",
    refreshResult.karma_score >= 0,
  );
  TestValidator.predicate(
    "created_at present",
    refreshResult.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    refreshResult.updated_at.length > 0,
  );
  // Step 6: Verify new tokens are generated (token rotation)
  TestValidator.predicate(
    "new access token generated",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token generated",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "new expiresAt present",
    refreshResult.expiresAt.length > 0,
  );
  // Step 7: Verify token rotation occurred (new tokens differ from original)
  TestValidator.notEquals(
    "access token rotated",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
  // Step 8: Verify new access token expires in the future
  const expiresAtDate: Date = new Date(refreshResult.expiresAt);
  const now: Date = new Date();
  TestValidator.predicate("expiresAt is in future", expiresAtDate > now);
  // Step 9: Verify old refresh token is invalidated (attempt to use it again should fail)
  await TestValidator.error("old refresh token invalidated", async () => {
    const invalidRefreshConnection: api.IConnection = { host: connection.host };
    await authorize_member_refresh(invalidRefreshConnection, {
      body: {
        refresh: originalRefreshToken,
      } satisfies IRedditPlatformMember.IRefresh,
    });
  });
  // Step 10: Verify new refresh token can be used for subsequent refreshes
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResult: IRedditPlatformMember.IAuthorized =
    await authorize_member_refresh(secondRefreshConnection, {
      body: {
        refresh: refreshResult.token.refresh,
      } satisfies IRedditPlatformMember.IRefresh,
    });
  typia.assert(secondRefreshResult);
  // Step 11: Verify second refresh also rotates tokens
  TestValidator.notEquals(
    "second refresh rotates access token",
    secondRefreshResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "second refresh rotates refresh token",
    secondRefreshResult.token.refresh,
    refreshResult.token.refresh,
  );
}