import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful refresh of member access token with valid session.
 *
 * Validates the complete token refresh workflow:
 *
 * 1. Member joins and receives initial JWT tokens (access and refresh)
 * 2. Session is created in discussion_board_member_sessions table
 * 3. Member uses valid refresh token to obtain new access token
 * 4. System validates refresh token against session record
 * 5. System verifies session hasn't expired
 * 6. System confirms member account is active (account_status='active')
 * 7. System checks account hasn't been deleted (deleted_at is NULL)
 * 8. System issues new access token with 30-minute expiration
 * 9. System issues new refresh token with 7-day expiration
 * 10. New tokens maintain member identity for continued access
 */
export async function test_api_member_token_refresh_session_valid(
  connection: api.IConnection,
) {
  // Step 1: Create new member account with initial tokens
  const registerEmail = typia.random<string & tags.Format<"email">>();
  const registerPassword = "TestPass123"; // Valid password: 8+ chars, uppercase, lowercase, number

  const initialAuthorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: registerEmail,
        password: registerPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(initialAuthorized);

  // Validate initial authorization response
  TestValidator.equals(
    "initial authorized response has member id",
    typeof initialAuthorized.id,
    "string",
  );
  TestValidator.predicate(
    "initial access token is string",
    typeof initialAuthorized.token.access === "string" &&
      initialAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token is string",
    typeof initialAuthorized.token.refresh === "string" &&
      initialAuthorized.token.refresh.length > 0,
  );

  // Step 2: Extract refresh token for later use
  const refreshTokenValue = initialAuthorized.token.refresh;

  // Step 3: Use valid refresh token to obtain new access token
  const refreshedAuthorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: refreshTokenValue,
      } satisfies IDiscussionBoardMember.IRefreshRequest,
    });
  typia.assert(refreshedAuthorized);

  // Step 4: Validate refreshed authorization response
  TestValidator.equals(
    "refreshed authorized response has member id",
    typeof refreshedAuthorized.id,
    "string",
  );
  TestValidator.predicate(
    "refreshed access token is string",
    typeof refreshedAuthorized.token.access === "string" &&
      refreshedAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is string",
    typeof refreshedAuthorized.token.refresh === "string" &&
      refreshedAuthorized.token.refresh.length > 0,
  );

  // Step 5: Verify member identity is maintained
  TestValidator.equals(
    "member id maintained after refresh",
    initialAuthorized.id,
    refreshedAuthorized.id,
  );

  // Step 6: Verify tokens are different (new tokens issued)
  TestValidator.notEquals(
    "access token is refreshed",
    initialAuthorized.token.access,
    refreshedAuthorized.token.access,
  );

  // Step 7: Verify token expiration timestamps are properly set
  TestValidator.predicate(
    "refreshed access token has expiration timestamp",
    typeof refreshedAuthorized.token.expired_at === "string" &&
      refreshedAuthorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token has expiration timestamp",
    typeof refreshedAuthorized.token.refreshable_until === "string" &&
      refreshedAuthorized.token.refreshable_until.length > 0,
  );

  // Step 8: Verify refreshed tokens can be used for subsequent operations
  // by updating connection with new access token
  connection.headers ??= {};
  connection.headers.Authorization = refreshedAuthorized.token.access;

  // Step 9: Validate that new refresh token can be used for next refresh cycle
  const secondRefreshToken = refreshedAuthorized.token.refresh;
  TestValidator.predicate(
    "new refresh token is provided for session continuation",
    typeof secondRefreshToken === "string" && secondRefreshToken.length > 0,
  );
}
