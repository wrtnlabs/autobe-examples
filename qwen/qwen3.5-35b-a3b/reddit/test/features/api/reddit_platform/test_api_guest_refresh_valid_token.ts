import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a guest account to obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(1),
    bio: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformGuest.IJoin;
  const joinResponse = await authorize_guest_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joinResponse);
  // Verify initial response structure
  const initialToken = joinResponse.token;
  typia.assert(initialToken);
  const initialGuestId = joinResponse.id;
  const initialEmail = joinResponse.email;
  const initialUsername = joinResponse.username;
  const initialDisplayName = joinResponse.display_name;
  // Step 2: Create a fresh connection for the refresh request
  // The refresh endpoint validates the refresh token directly
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshBody = {
    refresh_token: initialToken.refresh,
  } satisfies IRedditPlatformGuest.IRefresh;
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: refreshBody,
  });
  typia.assert(refreshResponse);
  // Step 3: Validate refresh response structure
  const refreshedToken = refreshResponse.token;
  typia.assert(refreshedToken);
  // Step 4: Verify token expiration times
  const now = new Date();
  const refreshedAccessExpiry = new Date(refreshedToken.expired_at);
  const refreshedSessionDeadline = new Date(refreshedToken.refreshable_until);
  // Access token should expire within 2 hours (7200000 ms) from now
  const accessExpiresWithin2Hours =
    refreshedAccessExpiry.getTime() - now.getTime() <= 7200000;
  TestValidator.predicate(
    "access token expires within 2 hours",
    accessExpiresWithin2Hours,
  );
  // Refresh token should be valid for at least 7 days (604800000 ms)
  const refreshValidForAtLeast7Days =
    refreshedSessionDeadline.getTime() - now.getTime() >= 604800000;
  TestValidator.predicate(
    "refresh token valid for at least 7 days",
    refreshValidForAtLeast7Days,
  );
  // Step 5: Verify guest identity consistency
  TestValidator.equals("guest id matches", refreshResponse.id, initialGuestId);
  TestValidator.equals("email matches", refreshResponse.email, initialEmail);
  TestValidator.equals(
    "username matches",
    refreshResponse.username,
    initialUsername,
  );
  TestValidator.equals(
    "display name matches",
    refreshResponse.display_name,
    initialDisplayName,
  );
  TestValidator.equals("bio matches", refreshResponse.bio, joinResponse.bio);
  TestValidator.equals(
    "avatar URL matches",
    refreshResponse.avatar_url,
    joinResponse.avatar_url,
  );
  TestValidator.equals(
    "karma matches",
    refreshResponse.karma,
    joinResponse.karma,
  );
  // Step 6: Verify sessions array exists and has proper structure
  typia.assert(refreshResponse.sessions);
  TestValidator.predicate(
    "sessions array exists",
    refreshResponse.sessions.length > 0,
  );
  // Verify session structure (at least one session)
  const firstSession = refreshResponse.sessions[0];
  typia.assert(firstSession);
  TestValidator.equals(
    "session guest id matches",
    firstSession.reddit_platform_guest_id,
    initialGuestId,
  );
  TestValidator.predicate(
    "session created at is valid",
    firstSession.created_at !== undefined && firstSession.created_at !== null,
  );
  TestValidator.predicate(
    "session expired at is valid",
    firstSession.expired_at !== undefined && firstSession.expired_at !== null,
  );
  // Step 7: Verify new tokens are different from old tokens (rotation)
  TestValidator.notEquals(
    "new access token differs from old",
    refreshedToken.access,
    initialToken.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    refreshedToken.refresh,
    initialToken.refresh,
  );
  // Step 8: Verify token format (JWT should have three parts separated by dots)
  const accessTokenParts = refreshedToken.access.split(".");
  TestValidator.equals(
    "access token has correct JWT format",
    accessTokenParts.length,
    3,
  );
  const refreshTokenParts = refreshedToken.refresh.split(".");
  TestValidator.equals(
    "refresh token has correct JWT format",
    refreshTokenParts.length,
    3,
  );
}
