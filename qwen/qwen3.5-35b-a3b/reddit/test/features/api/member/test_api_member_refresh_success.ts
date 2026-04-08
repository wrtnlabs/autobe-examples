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

export async function test_api_member_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account to obtain initial tokens and identity
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Store original tokens for rotation comparison
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  const originalExpiresAt = joinResult.token.expired_at;
  // 3. Create refresh connection and obtain new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    },
  });
  typia.assert(refreshResult);
  // 4. Validate member identity consistency
  TestValidator.equals("member_id matches", refreshResult.id, joinResult.id);
  TestValidator.equals("email matches", refreshResult.email, joinResult.email);
  TestValidator.equals(
    "username matches",
    refreshResult.username,
    joinResult.username,
  );
  TestValidator.equals("karma matches", refreshResult.karma, joinResult.karma);
  TestValidator.equals(
    "created_at matches",
    refreshResult.created_at,
    joinResult.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    refreshResult.updated_at,
    joinResult.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    refreshResult.deleted_at,
    joinResult.deleted_at,
  );
  // 5. Validate token rotation (tokens must be different)
  TestValidator.notEquals(
    "access token rotated",
    refreshResult.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
  // 6. Validate expiration timing (should be ~1 hour from refresh time)
  const refreshTime = new Date();
  const expectedExpiresAt = new Date(refreshTime.getTime() + 60 * 60 * 1000); // 1 hour in milliseconds
  const actualExpiresAt = new Date(refreshResult.token.expired_at);
  // Allow 5 seconds tolerance for server processing time
  const timeDifference = Math.abs(
    actualExpiresAt.getTime() - expectedExpiresAt.getTime(),
  );
  TestValidator.predicate(
    "expires_at is approximately 1 hour from now",
    timeDifference < 5000,
  );
  // 7. Validate new refreshable_until is also ~1 hour from refresh time
  const expectedRefreshableUntil = new Date(
    refreshTime.getTime() + 60 * 60 * 1000,
  );
  const actualRefreshableUntil = new Date(
    refreshResult.token.refreshable_until,
  );
  const refreshableTimeDifference = Math.abs(
    actualRefreshableUntil.getTime() - expectedRefreshableUntil.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is approximately 1 hour from now",
    refreshableTimeDifference < 5000,
  );
}