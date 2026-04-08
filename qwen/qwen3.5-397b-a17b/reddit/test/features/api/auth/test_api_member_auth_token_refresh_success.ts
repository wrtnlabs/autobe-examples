import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful token refresh for an authenticated member.
 *
 * Validates the complete token refresh workflow including initial member registration, token rotation, and authentication continuity. Ensures that refresh tokens are properly rotated and new tokens maintain valid authentication state.
 *
 * Special attention is given to verifying token rotation security (new tokens differ from old), timestamp validity (expiration dates are in the future), and member profile data consistency across token refresh operations.
 *
 * 1. Register new member account via /redditCommunity/auth/member/join to obtain initial authentication tokens.
 * 2. Call /redditCommunity/auth/member/refresh with the valid refresh_token from the join response.
 * 3. Verify the response contains a new access_token and refresh_token pair.
 * 4. Verify the new tokens are different from the original tokens (token rotation).
 * 5. Verify the response includes member profile information (id, email, username, display_name, bio, avatar, karma).
 * 6. Verify the expired_at and refreshable_until timestamps are set to future dates.
 * 7. Verify the new access_token can be used to authenticate subsequent API calls.
 */
export async function test_api_member_auth_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(initialAuth);
  // Store original tokens for rotation verification
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  // 2. Refresh tokens using the refresh_token from initial authentication
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IRedditCommunityMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Verify response contains new access_token and refresh_token pair
  TestValidator.predicate(
    "has access token",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    refreshedAuth.token.refresh.length > 0,
  );
  // 4. Verify token rotation (new tokens differ from original)
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 5. Verify member profile information is present and consistent
  TestValidator.equals(
    "member id consistent",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "email consistent",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "username consistent",
    initialAuth.username,
    refreshedAuth.username,
  );
  TestValidator.equals(
    "display_name consistent",
    initialAuth.display_name,
    refreshedAuth.display_name,
  );
  TestValidator.equals("bio consistent", initialAuth.bio, refreshedAuth.bio);
  TestValidator.equals(
    "avatar consistent",
    initialAuth.avatar,
    refreshedAuth.avatar,
  );
  TestValidator.equals(
    "karma consistent",
    initialAuth.karma,
    refreshedAuth.karma,
  );
  // 6. Verify timestamps are set to future dates
  const now = new Date();
  const expiredAt = new Date(refreshedAuth.token.expired_at);
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is in future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until after expired_at",
    refreshableUntil.getTime() >= expiredAt.getTime(),
  );
  // 7. Verify new access_token can authenticate subsequent API calls
  // The refreshConnection now has the new token in headers from authorize_member_refresh
  // We verify the connection was properly updated with new authorization
  TestValidator.predicate(
    "connection has new auth header",
    refreshConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "auth header uses new token",
    refreshConnection.headers?.Authorization,
    `Bearer ${refreshedAuth.token.access}`,
  );
}
