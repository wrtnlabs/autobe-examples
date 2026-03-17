import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
 * Test successful token refresh after member join.
 *
 * 1. Create a new member account via join endpoint to obtain initial access and refresh tokens.
 * 2. Extract the refresh_token from the join response.
 * 3. Call the refresh endpoint with the valid refresh_token.
 * 4. Verify that the response contains new access and refresh tokens with valid JWT formats.
 * 5. Ensure the new tokens are different from the original ones, confirming token rotation.
 * 6. Validate that the token expiration timestamps (expired_at, refreshable_until) are properly set and in the future.
 * 7. Check that the member information includes correct karma score (should be 0 for new member), empty posts/comments arrays, and proper profile fields.
 */
export async function test_api_member_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new member account using join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // Store original tokens for comparison
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  const originalExpiredAt = joinResult.token.expired_at;
  const originalRefreshableUntil = joinResult.token.refreshable_until;
  // Step 2 & 3: Call refresh endpoint with the obtained refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    },
  });
  typia.assert(refreshResult);
  // Step 4: Validate new tokens have valid JWT format (non-empty strings)
  TestValidator.predicate(
    "access token should not be empty",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should not be empty",
    refreshResult.token.refresh.length > 0,
  );
  // Step 5: Ensure token rotation - new tokens should be different from original
  TestValidator.notEquals(
    "access token should be rotated",
    originalAccessToken,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    originalRefreshToken,
    refreshResult.token.refresh,
  );
  // Step 6: Validate expiration timestamps are in the future and properly set
  const now = new Date();
  const expiredAtDate = new Date(refreshResult.token.expired_at);
  const refreshableUntilDate = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate(
    "expired_at should be in the future",
    expiredAtDate > now,
  );
  TestValidator.predicate(
    "refreshable_until should be in the future",
    refreshableUntilDate > now,
  );
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshableUntilDate > expiredAtDate,
  );
  // Step 7: Validate member information matches original member
  TestValidator.equals(
    "member ID should match",
    joinResult.id,
    refreshResult.id,
  );
  TestValidator.equals(
    "username should match",
    joinResult.username,
    refreshResult.username,
  );
  TestValidator.equals(
    "email should match",
    joinResult.email,
    refreshResult.email,
  );
  TestValidator.equals(
    "nickname should match",
    joinResult.nickname,
    refreshResult.nickname,
  );
  TestValidator.equals(
    "email_verified should match",
    joinResult.email_verified,
    refreshResult.email_verified,
  );
  TestValidator.equals(
    "registered_at should match",
    joinResult.registered_at,
    refreshResult.registered_at,
  );
  TestValidator.equals(
    "last_login_at should match",
    joinResult.last_login_at,
    refreshResult.last_login_at,
  );
  TestValidator.equals(
    "created_at should match",
    joinResult.created_at,
    refreshResult.created_at,
  );
  TestValidator.equals(
    "updated_at should match",
    joinResult.updated_at,
    refreshResult.updated_at,
  );
  // Step 8: Verify karma score is 0 for new member
  TestValidator.equals(
    "karma should be 0 for new member",
    refreshResult.karma,
    0,
  );
  // Step 9: Check posts/comments arrays are empty for new member
  TestValidator.equals(
    "posts array should be empty for new member",
    refreshResult.posts.length,
    0,
  );
  TestValidator.equals(
    "comments array should be empty for new member",
    refreshResult.comments.length,
    0,
  );
  // Step 10: Verify profile fields
  TestValidator.predicate(
    "bio should be null for new member",
    refreshResult.bio === null,
  );
  TestValidator.predicate(
    "avatar should be null for new member",
    refreshResult.avatar === null,
  );
}
