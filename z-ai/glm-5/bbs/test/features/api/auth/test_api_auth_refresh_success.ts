import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_auth_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user account and obtain initial tokens
  const userConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_user_join(userConnection, {});
  typia.assert(joinResponse);
  // Store original token values for comparison
  const originalRefreshToken = joinResponse.token.refresh;
  const originalAccessToken = joinResponse.token.access;
  const originalUserId = joinResponse.id;
  const originalEmail = joinResponse.email;
  const originalDisplayName = joinResponse.displayName;
  const originalPermissionLevel = joinResponse.permission_level;
  // Step 2: Call refresh endpoint with the refresh_token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_user_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IDiscussionBoardUser.IRefresh,
  });
  typia.assert(refreshResponse);
  // Step 3: Validate refresh_token unchanged (session continuity)
  TestValidator.equals(
    "refresh_token should remain unchanged",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  // Step 4: Validate new access_token is different (token renewal)
  TestValidator.notEquals(
    "access_token should be renewed",
    refreshResponse.token.access,
    originalAccessToken,
  );
  // Step 5: Validate user profile data preserved
  TestValidator.equals(
    "user id should match",
    refreshResponse.id,
    originalUserId,
  );
  TestValidator.equals(
    "email should match",
    refreshResponse.email,
    originalEmail,
  );
  TestValidator.equals(
    "displayName should match",
    refreshResponse.displayName,
    originalDisplayName,
  );
  TestValidator.equals(
    "permission_level should match",
    refreshResponse.permission_level,
    originalPermissionLevel,
  );
  // Step 6: Validate token expiration timestamps are valid
  const now = new Date();
  const expiredAt = new Date(refreshResponse.token.expired_at);
  const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
  TestValidator.predicate(
    "expired_at should be in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshableUntil > expiredAt,
  );
}
