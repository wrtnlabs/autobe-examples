import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful token refresh using a valid refresh token obtained from member registration.
 *
 * Validates the complete token refresh workflow: member registration produces initial JWT tokens, then the refresh endpoint exchanges the refresh token for a new token pair with rotation. Ensures the new access token and refresh token differ from the original pair, confirming that token rotation occurred on refresh.
 *
 * Also validates that the refresh response includes the full member profile with all expected fields initialized to their post-registration defaults — id (UUID), username, display_name (defaults to username), bio (null), avatar_uri (null), karma (0), created_at timestamp, empty posts array, and empty comments array. The token structure is validated with all required fields present and future-oriented expiration timestamps where expired_at precedes refreshable_until.
 *
 * 1. Register a new member via authorize_member_join to obtain initial JWT tokens.
 * 2. Extract the refresh token from the join response.
 * 3. Call authorize_member_refresh with the extracted refresh token.
 * 4. Verify the new access and refresh tokens differ from the original pair.
 * 5. Validate the full member profile structure in the refresh response.
 * 6. Validate token expiration timestamps are in the future with correct ordering.
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {});
  typia.assert(joinResponse);
  // 2. Extract the refresh token
  const originalRefreshToken = joinResponse.token.refresh;
  const originalAccessToken = joinResponse.token.access;
  // 3. Refresh the token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies ICommunityHubMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Verify token rotation — new tokens must differ from originals
  TestValidator.notEquals(
    "access token rotated",
    refreshResponse.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  // 5. Validate member profile — same member, expected defaults
  TestValidator.equals("same member id", refreshResponse.id, joinResponse.id);
  TestValidator.equals(
    "same username",
    refreshResponse.username,
    joinResponse.username,
  );
  TestValidator.equals(
    "same display_name",
    refreshResponse.display_name,
    joinResponse.display_name,
  );
  TestValidator.equals("bio is null initially", refreshResponse.bio, null);
  TestValidator.equals(
    "avatar_uri is null initially",
    refreshResponse.avatar_uri,
    null,
  );
  TestValidator.equals("karma initialized to 0", refreshResponse.karma, 0);
  TestValidator.equals(
    "posts array is empty initially",
    refreshResponse.posts.length,
    0,
  );
  TestValidator.equals(
    "comments array is empty initially",
    refreshResponse.comments.length,
    0,
  );
  // 6. Validate token structure with future timestamps
  const now = new Date();
  const expiredAt = new Date(refreshResponse.token.expired_at);
  const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}
