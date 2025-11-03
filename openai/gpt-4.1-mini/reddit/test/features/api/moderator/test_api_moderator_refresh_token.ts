import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

/**
 * Test the token refresh functionality for an authenticated moderator user.
 *
 * This scenario performs the following steps:
 *
 * 1. Create a new moderator user account via the join endpoint.
 * 2. Capture the initial JWT access and refresh tokens.
 * 3. Use the refresh token to request new JWT tokens via the refresh endpoint.
 * 4. Validate that these new tokens differ from the initial tokens and are valid.
 * 5. Attempt a refresh with an invalid refresh token to verify error handling.
 */
export async function test_api_moderator_refresh_token(
  connection: api.IConnection,
) {
  // 1. Create a new moderator user account via join endpoint
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123!";

  const joinBody = {
    email,
    password,
    ip: null,
    href: "https://redditCommunity.example.com/moderator/signup",
    referrer: "https://redditCommunity.example.com/",
  } satisfies IRedditCommunityModerator.IJoin;

  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });
  typia.assert(moderator);

  // Validate initial tokens are present
  TestValidator.predicate(
    "Initial access token is present",
    typeof moderator.token.access === "string" &&
      moderator.token.access.length > 0,
  );
  TestValidator.predicate(
    "Initial refresh token is present",
    typeof moderator.token.refresh === "string" &&
      moderator.token.refresh.length > 0,
  );

  // 2. Use the refresh token to request new JWT tokens
  const refreshBody = {
    refresh_token: moderator.token.refresh,
    signoutAllSessions: false,
  } satisfies IRedditCommunityModerator.IRefresh;

  const refreshed: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 3. Validate that new tokens are different from the initial tokens
  TestValidator.notEquals(
    "Refreshed access token differs from initial",
    refreshed.token.access,
    moderator.token.access,
  );
  TestValidator.notEquals(
    "Refreshed refresh token differs from initial",
    refreshed.token.refresh,
    moderator.token.refresh,
  );

  // 4. Attempt refresh with an invalid refresh token
  const invalidRefreshBody = {
    refresh_token: "invalid_refresh_token_1234567890",
  } satisfies IRedditCommunityModerator.IRefresh;

  await TestValidator.error(
    "Refresh attempt fails with invalid refresh token",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );
}
