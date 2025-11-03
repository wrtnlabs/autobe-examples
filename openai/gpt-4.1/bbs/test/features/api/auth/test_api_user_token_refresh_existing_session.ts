import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that a discussion board user can successfully refresh their JWT
 * authentication tokens using a valid, unexpired refresh token. Validates both
 * the success path and major error scenarios.
 *
 * Scenario:
 *
 * 1. Register a discussion board user via /auth/user/join
 * 2. Use the issued refresh token to authenticate to /auth/user/refresh
 * 3. Check that the new tokens are valid JWTs, distinct from the originals, and
 *    the user remains authenticated
 * 4. Try to refresh with an obviously-invalid (junk) token and expect error
 * 5. (Cannot practically generate expired/revoked tokens in pure E2E, so simulate
 *    with a bad token for negative test)
 *
 * Business context: Security, session lifecycle, authentication resilience,
 * error handling.
 */
export async function test_api_user_token_refresh_existing_session(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    avatar_url: undefined,
  } satisfies IDiscussionBoardUser.ICreate;

  const joinResult = await api.functional.auth.user.join(connection, {
    body: userBody,
  });
  typia.assert(joinResult);

  // Keep the issued tokens
  const originalToken = joinResult.token;
  typia.assert(originalToken);

  // Sanity checks for original token values
  TestValidator.predicate(
    "original access token is non-empty string",
    typeof originalToken.access === "string" && originalToken.access.length > 0,
  );
  TestValidator.predicate(
    "original refresh token is non-empty string",
    typeof originalToken.refresh === "string" &&
      originalToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "original access token expiry is valid ISO date string",
    typeof originalToken.expired_at === "string" &&
      !Number.isNaN(Date.parse(originalToken.expired_at)),
  );
  TestValidator.predicate(
    "original refreshable_until is valid ISO date string",
    typeof originalToken.refreshable_until === "string" &&
      !Number.isNaN(Date.parse(originalToken.refreshable_until)),
  );

  // 2. Call refresh API with the refresh token
  const refreshBody = {
    refresh_token: originalToken.refresh,
  } satisfies IDiscussionBoardUser.IRefresh;
  const refreshResult = await api.functional.auth.user.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshResult);

  // 3. Check for returned tokens validity and uniqueness
  const refreshedToken = refreshResult.token;
  typia.assert(refreshedToken);

  TestValidator.predicate(
    "refreshed access token is non-empty string",
    typeof refreshedToken.access === "string" &&
      refreshedToken.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is non-empty string",
    typeof refreshedToken.refresh === "string" &&
      refreshedToken.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access token changes after refresh",
    refreshedToken.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "refresh token changes after refresh",
    refreshedToken.refresh,
    originalToken.refresh,
  );
  TestValidator.equals(
    "same user id after refresh",
    refreshResult.id,
    joinResult.id,
  );
  TestValidator.equals("user stays unlocked", refreshResult.is_locked, false);

  // 4. Error scenario: Try to refresh with garbage/invalid token
  await TestValidator.error("refresh with invalid token fails", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: RandomGenerator.alphaNumeric(64),
      } satisfies IDiscussionBoardUser.IRefresh,
    });
  });
}
