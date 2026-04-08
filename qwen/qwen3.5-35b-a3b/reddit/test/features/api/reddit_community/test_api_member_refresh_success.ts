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

export async function test_api_member_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to create initial session with tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      username: RandomGenerator.name(2),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(initialAuth);
  // Store original tokens and member identity for comparison
  const originalRefreshToken = initialAuth.token.refresh;
  const originalExpiredAt = initialAuth.token.expired_at;
  const originalRefreshableUntil = initialAuth.token.refreshable_until;
  const originalMemberId = initialAuth.id;
  const originalEmail = initialAuth.email;
  const originalUsername = initialAuth.username;
  // 2. Submit token refresh request with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IRedditCommunityMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Validate token rotation - new tokens should be different from original
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  // 4. Validate member identity remains unchanged across refresh
  TestValidator.equals(
    "member ID unchanged",
    refreshedAuth.id,
    originalMemberId,
  );
  TestValidator.equals("email unchanged", refreshedAuth.email, originalEmail);
  TestValidator.equals(
    "username unchanged",
    refreshedAuth.username,
    originalUsername,
  );
  // 5. Validate timestamps are properly set and extended
  const now = new Date();
  const refreshedExpiredAt = new Date(refreshedAuth.token.expired_at);
  const refreshedRefreshableUntil = new Date(
    refreshedAuth.token.refreshable_until,
  );
  const originalExpiredAtDate = new Date(originalExpiredAt);
  const originalRefreshableUntilDate = new Date(originalRefreshableUntil);
  TestValidator.predicate(
    "access token expiration is in the future",
    refreshedExpiredAt > now,
  );
  TestValidator.predicate(
    "refreshable_until extends or maintains session deadline",
    refreshedRefreshableUntil >= originalRefreshableUntilDate,
  );
  // 6. Validate the refresh connection has updated authorization header
  TestValidator.predicate(
    "refresh connection has updated authorization header",
    refreshConnection.headers?.Authorization !== undefined,
  );
  // 7. Validate response structure matches IAuthorized schema completely
  typia.assert(refreshedAuth);
}