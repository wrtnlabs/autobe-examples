import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that successful token refresh extends session duration by 7 days.
 *
 * This scenario validates that the expired_at timestamp in
 * discussion_board_member_sessions table is properly updated on successful
 * refresh. A member joins, then refreshes their token. The system should update
 * the session's expired_at to 7 days from the refresh time, enabling indefinite
 * session continuation through periodic refresh operations.
 *
 * 1. Member registers with email and password
 * 2. System creates initial session with expired_at = now + 7 days
 * 3. Member receives access token (30-minute expiration) and refresh token (7-day
 *    expiration)
 * 4. After some time, member refreshes their token using the refresh token
 * 5. System validates the refresh token and member account status
 * 6. System updates the session's expired_at to 7 days from the refresh time
 * 7. Member receives new access token and continues using the service
 * 8. Validate that the session duration was properly extended
 */
export async function test_api_member_token_refresh_extends_session_duration(
  connection: api.IConnection,
) {
  // Step 1: Member registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const registerResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(registerResponse);

  TestValidator.predicate(
    "initial registration should return valid member ID",
    registerResponse.id.length > 0,
  );

  TestValidator.predicate(
    "initial authorization token should have access token",
    registerResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "initial authorization token should have refresh token",
    registerResponse.token.refresh.length > 0,
  );

  // Step 2: Capture the initial session expiration time
  const initialToken = registerResponse.token;
  const initialExpiredAt = new Date(initialToken.expired_at);
  const initialRefreshableUntil = new Date(initialToken.refreshable_until);

  TestValidator.predicate(
    "access token should expire within expected time range",
    initialExpiredAt.getTime() > Date.now() &&
      initialExpiredAt.getTime() - Date.now() < 2 * 60 * 60 * 1000, // within 2 hours
  );

  TestValidator.predicate(
    "refresh token should expire in 7 days",
    initialRefreshableUntil.getTime() > Date.now() &&
      initialRefreshableUntil.getTime() - Date.now() > 6 * 24 * 60 * 60 * 1000, // at least 6 days
  );

  // Step 3: Wait a brief moment to ensure time passes
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 4: Refresh the token using the refresh token
  const refreshResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: initialToken.refresh,
      } satisfies IDiscussionBoardMember.IRefreshRequest,
    });
  typia.assert(refreshResponse);

  TestValidator.predicate(
    "refresh should return valid member ID",
    refreshResponse.id === registerResponse.id,
  );

  // Step 5: Capture the new session expiration time
  const refreshedToken = refreshResponse.token;
  const refreshedExpiredAt = new Date(refreshedToken.expired_at);
  const refreshedRefreshableUntil = new Date(refreshedToken.refreshable_until);

  TestValidator.predicate(
    "refreshed access token should have new expiration",
    refreshedExpiredAt.getTime() > initialExpiredAt.getTime(),
  );

  TestValidator.predicate(
    "refreshed access token should be newly issued",
    refreshedToken.access !== initialToken.access,
  );

  TestValidator.predicate(
    "refreshed refresh token should extend the refresh window",
    refreshedRefreshableUntil.getTime() > initialRefreshableUntil.getTime(),
  );

  // Step 6: Validate the 7-day extension mechanism
  const timeDiffMs = refreshedRefreshableUntil.getTime() - Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  TestValidator.predicate(
    "refreshed refresh token should have approximately 7-day expiration",
    Math.abs(timeDiffMs - sevenDaysMs) < 5 * 60 * 1000, // within 5 minutes of 7 days
  );

  // Step 7: Perform another refresh to validate rolling window
  const secondRefreshResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: refreshedToken.refresh,
      } satisfies IDiscussionBoardMember.IRefreshRequest,
    });
  typia.assert(secondRefreshResponse);

  const secondRefreshedToken = secondRefreshResponse.token;
  const secondRefreshedRefreshableUntil = new Date(
    secondRefreshedToken.refreshable_until,
  );

  TestValidator.predicate(
    "second refresh should further extend the refresh window",
    secondRefreshedRefreshableUntil.getTime() >
      refreshedRefreshableUntil.getTime(),
  );

  // Step 8: Validate rolling window mechanism allows indefinite sessions
  TestValidator.predicate(
    "each refresh extends session by approximately 7 days",
    secondRefreshedRefreshableUntil.getTime() -
      refreshedRefreshableUntil.getTime() >
      6 * 24 * 60 * 60 * 1000,
  );
}
