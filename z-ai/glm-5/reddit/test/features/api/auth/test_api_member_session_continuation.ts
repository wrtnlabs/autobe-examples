import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_member_session_continuation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {});
  typia.assert(initialAuth);
  const initialTokens = initialAuth.token;
  const memberId = initialAuth.id;
  const memberUsername = initialAuth.username;
  // Step 2: Verify initial tokens are valid
  TestValidator.predicate(
    "initial access token exists",
    initialTokens.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token exists",
    initialTokens.refresh.length > 0,
  );
  TestValidator.predicate(
    "initial expired_at is valid date",
    new Date(initialTokens.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "initial refreshable_until is valid date",
    new Date(initialTokens.refreshable_until) > new Date(),
  );
  // Step 3: Refresh the tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: initialTokens.refresh,
    } satisfies ICommunityPlatformMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  const refreshedTokens = refreshedAuth.token;
  // Step 4: Validate member identity preserved
  TestValidator.equals("member id preserved", refreshedAuth.id, memberId);
  TestValidator.equals(
    "member username preserved",
    refreshedAuth.username,
    memberUsername,
  );
  // Step 5: Validate new tokens are valid
  TestValidator.predicate(
    "refreshed access token exists",
    refreshedTokens.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token exists",
    refreshedTokens.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed expired_at is valid date",
    new Date(refreshedTokens.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshed refreshable_until is valid date",
    new Date(refreshedTokens.refreshable_until) > new Date(),
  );
  // Step 6: Validate tokens are rotated
  TestValidator.notEquals(
    "access token rotated",
    refreshedTokens.access,
    initialTokens.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedTokens.refresh,
    initialTokens.refresh,
  );
  // Step 7: Validate connection is updated with new access token
  TestValidator.predicate(
    "connection has new access token",
    refreshConnection.headers?.Authorization === refreshedTokens.access,
  );
}
