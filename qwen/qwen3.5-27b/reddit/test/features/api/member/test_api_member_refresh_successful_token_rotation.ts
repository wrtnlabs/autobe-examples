import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful token rotation on member refresh.
 * 1. Register a new member to obtain initial tokens
 * 2. Refresh tokens using the initial refresh token
 * 3. Verify token rotation (new tokens differ from original)
 * 4. Verify updated expiration timestamps
 * 5. Verify complete member profile in response
 */
export async function test_api_member_refresh_successful_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(joinResponse);
  // Store original tokens for comparison
  const originalAccessToken = joinResponse.token.access;
  const originalRefreshToken = joinResponse.token.refresh;
  const originalExpiredAt = joinResponse.token.expired_at;
  const originalRefreshableUntil = joinResponse.token.refreshable_until;
  // 2. Refresh tokens using the initial refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IRedditCloneMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 3. Verify token rotation (new tokens differ from original)
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshResponse.token.refresh,
  );
  // 4. Verify updated expiration timestamps
  TestValidator.notEquals(
    "expired_at updated",
    originalExpiredAt,
    refreshResponse.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable_until updated",
    originalRefreshableUntil,
    refreshResponse.token.refreshable_until,
  );
  // 5. Verify complete member profile in response
  TestValidator.predicate(
    "has valid member id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      refreshResponse.id,
    ),
  );
  TestValidator.equals(
    "email matches registration",
    refreshResponse.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "username matches registration",
    refreshResponse.username,
    joinResponse.username,
  );
  TestValidator.equals(
    "display_name matches registration",
    refreshResponse.display_name,
    joinResponse.display_name,
  );
  TestValidator.equals("bio is null as registered", refreshResponse.bio, null);
  TestValidator.equals(
    "avatar_uri is null as registered",
    refreshResponse.avatar_uri,
    null,
  );
  TestValidator.equals(
    "karma is zero for new member",
    refreshResponse.karma,
    0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      refreshResponse.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      refreshResponse.updated_at,
    ),
  );
  TestValidator.equals(
    "deleted_at is null for active member",
    refreshResponse.deleted_at,
    null,
  );
  // 6. Verify new access token is set in connection headers
  TestValidator.predicate(
    "new access token set in connection",
    refreshConnection.headers?.Authorization ===
      `Bearer ${refreshResponse.token.access}`,
  );
}
