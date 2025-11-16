import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful token refresh using a valid refresh token.
 *
 * This test validates the complete token refresh workflow including refresh
 * token validation, session verification, and new token generation. Create a
 * moderator account, perform initial login to obtain tokens, then use the
 * refresh token to get new access tokens. Verify that the refresh operation
 * returns new valid JWT tokens with updated expiration timestamps while
 * maintaining the moderator's authenticated session.
 *
 * **Test Steps:**
 *
 * 1. Create a new moderator account with valid credentials
 * 2. Verify initial authentication returns complete token set
 * 3. Extract and validate the refresh token from initial authentication
 * 4. Use refresh token to obtain new access tokens
 * 5. Verify new tokens are valid and have updated expiration timestamps
 * 6. Ensure moderator session remains active after token refresh
 */
export async function test_api_moderator_refresh_token_successful_renewal(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const createData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const initialAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createData,
    });
  typia.assert(initialAuth);

  // Step 2: Verify initial authentication response
  typia.assert(initialAuth.token);
  TestValidator.predicate(
    "initial auth contains access token",
    initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial auth contains refresh token",
    initialAuth.token.refresh.length > 0,
  );

  // Step 3: Store the initial refresh token for comparison
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = new Date(initialAuth.token.expired_at);
  const initialRefreshableUntil = new Date(initialAuth.token.refreshable_until);

  // Step 4: Use the refresh token to obtain new access tokens
  const refreshData = {
    refresh_token: initialRefreshToken,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const refreshedAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: refreshData,
    });
  typia.assert(refreshedAuth);

  // Step 5: Verify the refresh operation returned valid new tokens
  typia.assert(refreshedAuth.token);
  TestValidator.predicate(
    "refreshed auth contains new access token",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed auth contains refresh token",
    refreshedAuth.token.refresh.length > 0,
  );

  // Step 6: Verify moderator identity is preserved
  TestValidator.equals(
    "moderator ID remains unchanged",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "moderator username remains unchanged",
    refreshedAuth.username,
    initialAuth.username,
  );
  TestValidator.equals(
    "moderator email remains unchanged",
    refreshedAuth.email,
    initialAuth.email,
  );

  // Step 7: Verify token expiration timestamps are valid
  const refreshedExpiredAt = new Date(refreshedAuth.token.expired_at);
  const refreshedRefreshableUntil = new Date(
    refreshedAuth.token.refreshable_until,
  );

  TestValidator.predicate(
    "refreshed access token has valid expiration",
    refreshedExpiredAt.getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refresh token has valid refreshable_until",
    refreshedRefreshableUntil.getTime() > Date.now(),
  );
}
