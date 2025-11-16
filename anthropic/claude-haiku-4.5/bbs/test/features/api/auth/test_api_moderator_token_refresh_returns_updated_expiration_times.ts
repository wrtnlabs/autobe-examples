import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that token refresh returns new JWT tokens with updated expiration
 * timestamps.
 *
 * This test validates the moderator token refresh flow by:
 *
 * 1. Logging in a moderator to obtain initial tokens with original expiration
 *    times
 * 2. Capturing the original token expiration timestamps (expired_at and
 *    refreshable_until)
 * 3. Calling the refresh endpoint with the refresh token to obtain new tokens
 * 4. Verifying that new tokens are returned with updated expiration timestamps
 * 5. Confirming that the new expired_at timestamp is later than the original
 * 6. Confirming that the new refreshable_until timestamp is later than the
 *    original
 * 7. Ensuring all timestamps are in ISO 8601 format for proper interoperability
 *
 * This ensures the refresh mechanism properly extends session lifetime and
 * provides valid tokens with future expiration dates for continued
 * authenticated access.
 */
export async function test_api_moderator_token_refresh_returns_updated_expiration_times(
  connection: api.IConnection,
) {
  // Step 1: Login moderator to get initial tokens with expiration times
  const loginBody = typia.random<IDiscussionBoardModerator.ILogin>();

  const initialAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });
  typia.assert(initialAuth);

  // Step 2: Capture original token expiration timestamps
  const originalExpiredAt: string = initialAuth.token.expired_at;
  const originalRefreshableUntil: string = initialAuth.token.refreshable_until;

  // Verify original timestamps are ISO 8601 formatted
  TestValidator.predicate(
    "original access token expiration is ISO 8601 formatted",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(originalExpiredAt),
  );
  TestValidator.predicate(
    "original refresh token expiration is ISO 8601 formatted",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      originalRefreshableUntil,
    ),
  );

  // Step 3: Call refresh endpoint with the refresh token
  const refreshBody = {
    refresh_token: initialAuth.token.refresh,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const refreshedAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedAuth);

  // Step 4: Verify refreshed tokens are valid
  TestValidator.predicate(
    "refreshed access token is not empty",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is not empty",
    refreshedAuth.token.refresh.length > 0,
  );

  // Step 5: Verify new expiration timestamps are ISO 8601 formatted
  const newExpiredAt: string = refreshedAuth.token.expired_at;
  const newRefreshableUntil: string = refreshedAuth.token.refreshable_until;

  TestValidator.predicate(
    "refreshed access token expiration is ISO 8601 formatted",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(newExpiredAt),
  );
  TestValidator.predicate(
    "refreshed refresh token expiration is ISO 8601 formatted",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      newRefreshableUntil,
    ),
  );

  // Step 6: Verify new expiration timestamps are later than originals
  const originalExpiredAtDate = new Date(originalExpiredAt);
  const newExpiredAtDate = new Date(newExpiredAt);

  TestValidator.predicate(
    "refreshed access token expiration is later than original",
    newExpiredAtDate.getTime() > originalExpiredAtDate.getTime(),
  );

  const originalRefreshableUntilDate = new Date(originalRefreshableUntil);
  const newRefreshableUntilDate = new Date(newRefreshableUntil);

  TestValidator.predicate(
    "refreshed refresh token expiration is later than original",
    newRefreshableUntilDate.getTime() > originalRefreshableUntilDate.getTime(),
  );

  // Step 7: Verify tokens are different (new tokens issued)
  TestValidator.notEquals(
    "new access token differs from original",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
}
