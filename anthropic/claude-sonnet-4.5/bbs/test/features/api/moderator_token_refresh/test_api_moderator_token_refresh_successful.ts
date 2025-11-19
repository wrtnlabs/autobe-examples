import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator token refresh using valid refresh token.
 *
 * This test validates the complete token refresh workflow for moderators:
 *
 * 1. Creates a new moderator account via registration
 * 2. Performs login to obtain initial access and refresh tokens
 * 3. Uses the refresh token to request new JWT tokens
 * 4. Validates that new tokens are returned with proper expiration times
 * 5. Verifies that access token expires in 30 minutes and refresh token in 7 days
 * 6. Confirms moderator profile information is included in response
 * 7. Ensures session remains active after token refresh
 */
export async function test_api_moderator_token_refresh_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();

  const joinData = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: moderatorUsername,
    display_name: displayName,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const joinedModerator = await api.functional.auth.moderator.join(connection, {
    body: joinData,
  });
  typia.assert(joinedModerator);

  // Step 2: Login to obtain initial tokens
  const loginData = {
    email: moderatorEmail,
    password: moderatorPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const loggedInModerator = await api.functional.auth.moderator.login(
    connection,
    {
      body: loginData,
    },
  );
  typia.assert(loggedInModerator);

  // Step 3: Extract refresh token from login response
  const initialRefreshToken = loggedInModerator.token.refresh;

  // Step 4: Use refresh token to obtain new tokens
  const refreshData = {
    refresh_token: initialRefreshToken,
  } satisfies IDiscussionBoardModerator.IRefresh;

  const refreshedModerator = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: refreshData,
    },
  );
  typia.assert(refreshedModerator);

  // Step 5: Validate response structure and moderator profile
  TestValidator.equals(
    "moderator ID matches",
    refreshedModerator.id,
    loggedInModerator.id,
  );
  TestValidator.equals(
    "moderator email matches",
    refreshedModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches",
    refreshedModerator.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "moderator display_name matches",
    refreshedModerator.display_name,
    displayName,
  );

  // Step 6: Validate new tokens are present and different from initial tokens
  TestValidator.predicate(
    "new access token is present",
    refreshedModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is present",
    refreshedModerator.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token has changed",
    refreshedModerator.token.access !== loggedInModerator.token.access,
  );
  TestValidator.predicate(
    "refresh token has changed",
    refreshedModerator.token.refresh !== loggedInModerator.token.refresh,
  );

  // Step 7: Validate token expiration timestamps
  const expiredAt = new Date(refreshedModerator.token.expired_at);
  const refreshableUntil = new Date(refreshedModerator.token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableUntil.getTime()),
  );
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );

  // Verify access token expires approximately 30 minutes from now (allow 1 minute tolerance)
  const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
  const accessTokenDiff = Math.abs(
    expiredAt.getTime() - thirtyMinutesFromNow.getTime(),
  );
  TestValidator.predicate(
    "access token expires in approximately 30 minutes",
    accessTokenDiff < 60 * 1000,
  );

  // Verify refresh token expires approximately 7 days from now (allow 1 hour tolerance)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const refreshTokenDiff = Math.abs(
    refreshableUntil.getTime() - sevenDaysFromNow.getTime(),
  );
  TestValidator.predicate(
    "refresh token expires in approximately 7 days",
    refreshTokenDiff < 60 * 60 * 1000,
  );

  // Step 8: Validate moderator account status
  TestValidator.equals(
    "moderator is active",
    refreshedModerator.is_active,
    true,
  );
  TestValidator.predicate(
    "moderator account is not deleted",
    refreshedModerator.deleted_at === null ||
      refreshedModerator.deleted_at === undefined,
  );
}
