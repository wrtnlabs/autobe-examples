import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_refresh_token_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = RandomGenerator.alphaNumeric(8);
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);

  const createdModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Step 2: Login to obtain initial tokens
  const loginResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies ICommunityPlatformModerator.ILogin,
    });
  typia.assert(loginResponse);

  // Store initial tokens for comparison
  const initialAccessToken = loginResponse.token.access;
  const initialRefreshToken = loginResponse.token.refresh;
  const initialExpiredAt = loginResponse.token.expired_at;
  const initialRefreshableUntil = loginResponse.token.refreshable_until;

  // Step 3: Use refresh token to obtain new tokens
  // Note: The refresh token is stored in HTTP-only cookies by the login operation
  // and is automatically sent by the backend during the refresh call
  const refreshConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const refreshResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(refreshConnection, {
      body: {} satisfies ICommunityPlatformModerator.IRefresh,
    });
  typia.assert(refreshResponse);

  // Step 4: Validate token rotation
  TestValidator.notEquals(
    "new access token must be different from initial",
    refreshResponse.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token must be different from initial",
    refreshResponse.token.refresh,
    initialRefreshToken,
  );

  // Verify refresh token was rotated (different hash)
  TestValidator.predicate("access token has been renewed", () => {
    // The access token should have been renewed with a new value and reasonable expiration
    const newExpiredAt = new Date(refreshResponse.token.expired_at);
    const initialExpiredAtDate = new Date(initialExpiredAt);
    const timeDiff = newExpiredAt.getTime() - initialExpiredAtDate.getTime();
    // New token expiration should be similar to initial with small margin for processing time
    return Math.abs(timeDiff) < 1000;
  });

  // Verify refreshable_until has been renewed
  TestValidator.predicate("refreshable_until has been extended", () => {
    const newRefreshableUntil = new Date(
      refreshResponse.token.refreshable_until,
    );
    const initialRefreshableUntilDate = new Date(initialRefreshableUntil);
    // Refresh token expiration should be extended
    return (
      newRefreshableUntil.getTime() > initialRefreshableUntilDate.getTime()
    );
  });
}
