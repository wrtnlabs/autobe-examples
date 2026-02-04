import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = `${RandomGenerator.alphaNumeric(16)}@example.com`;
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  // Step 1: Register a new moderator to obtain initial refresh token
  const initialAuth: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(initialAuth);
  // Step 2: Extract the refresh token from initial authentication
  const initialRefreshToken = initialAuth.token.refresh;
  // Step 3: Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 4: Test refresh operation with valid refresh token
  const refreshedAuth = await authorize_moderator_refresh(refreshConnection, {
    body: {
      token: initialRefreshToken,
    } satisfies ICommunityPlatformModerator.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 5: Validate that new token has proper structure
  const newToken = refreshedAuth.token;
  // Verify access token format
  TestValidator.predicate(
    "access token is a JWT string",
    typeof newToken.access === "string",
  );
  TestValidator.predicate(
    "refresh token is a JWT string",
    typeof newToken.refresh === "string",
  );
  // Calculate expiration from current time
  const now = new Date();
  const accessExpiredAt = new Date(newToken.expired_at);
  const refreshableUntil = new Date(newToken.refreshable_until);
  // Verify access token expires after approximately 7 days (168 hours)
  const sevenDaysMillis = 7 * 24 * 60 * 60 * 1000;
  const tolerance = 60 * 60 * 1000; // 1 hour tolerance
  TestValidator.predicate(
    "access token expires after approximately 7 days",
    accessExpiredAt.getTime() > now.getTime() + sevenDaysMillis - tolerance &&
      accessExpiredAt.getTime() < now.getTime() + sevenDaysMillis + tolerance,
  );
  // Verify refresh token is extended by exactly 30 days
  const thirtyDaysMillis = 30 * 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "refresh token extended by exactly 30 days",
    refreshableUntil.getTime() > now.getTime() + thirtyDaysMillis - tolerance &&
      refreshableUntil.getTime() < now.getTime() + thirtyDaysMillis + tolerance,
  );
  // Step 6: Validate old refresh token is invalidated
  await TestValidator.error("old refresh token should fail", async () => {
    await authorize_moderator_refresh(refreshConnection, {
      body: {
        token: initialRefreshToken, // Trying to use the old token
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  });
}
