import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test successful token refresh for a moderator account.
 *
 * Validates the complete moderator authentication token refresh workflow. First registers a new moderator account to obtain initial access and refresh tokens, then uses the refresh token to request new tokens via the refresh endpoint. Verifies that the response contains new access and refresh tokens with updated expiration timestamps.
 *
 * The test ensures that token refresh operations maintain session continuity without requiring re-authentication, while properly updating token expiration times for security.
 *
 * 1. Moderator registers with email, password, and user profile information.
 * 2. Initial authorization response contains access token (15-minute expiration) and refresh token (7-day expiration).
 * 3. Moderator uses refresh token to request new tokens.
 * 4. Refresh response contains new access and refresh tokens with updated expiration timestamps.
 * 5. Validates that new tokens have later expiration times than the original tokens.
 */
export async function test_api_moderator_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(initialAuth);
  // 2. Store initial token expiration times
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // 3. Refresh tokens using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_moderator_refresh(refreshConnection, {
    body: {
      refresh_token: initialAuth.token.refresh,
    } satisfies IRedditCloneModerator.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Validate moderator ID consistency
  TestValidator.equals(
    "moderator ID unchanged after refresh",
    refreshedAuth.id,
    initialAuth.id,
  );
  // 5. Validate new tokens have updated expiration times
  TestValidator.notEquals(
    "access token expired_at updated",
    refreshedAuth.token.expired_at,
    initialExpiredAt,
  );
  TestValidator.notEquals(
    "refresh token refreshable_until updated",
    refreshedAuth.token.refreshable_until,
    initialRefreshableUntil,
  );
  // 6. Validate new expiration times are in the future
  const now = new Date();
  TestValidator.predicate(
    "new access token expires in future",
    new Date(refreshedAuth.token.expired_at) > now,
  );
  TestValidator.predicate(
    "new refresh token valid until in future",
    new Date(refreshedAuth.token.refreshable_until) > now,
  );
}
