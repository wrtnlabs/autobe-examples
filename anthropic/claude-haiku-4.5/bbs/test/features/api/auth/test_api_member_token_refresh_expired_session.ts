import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test token refresh with valid session - core authentication flow.
 *
 * This test validates that the token refresh mechanism works correctly when a
 * member has a valid session. A member joins to create an account and obtain
 * initial tokens, then uses the refresh token to obtain new tokens. The system
 * should successfully issue new access and refresh tokens when the session is
 * still valid. This ensures the refresh token flow enables session
 * continuation.
 *
 * Note: Testing actual session expiration after 7 days would require backend
 * time-manipulation capabilities not available in the current API. This test
 * focuses on validating the core refresh flow with valid sessions.
 *
 * Test workflow:
 *
 * 1. Create member account via join endpoint with valid email and password
 * 2. Extract the refresh token from the authorization response
 * 3. Use the refresh token to request new tokens
 * 4. Verify that new tokens are issued successfully
 * 5. Confirm the new tokens have valid structure and expiration info
 */
export async function test_api_member_token_refresh_expired_session(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123";

  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(joinResponse);

  // Extract the refresh token from the initial response
  const refreshToken = joinResponse.token.refresh;
  TestValidator.predicate(
    "refresh token should be present from join response",
    refreshToken !== null &&
      refreshToken !== undefined &&
      refreshToken.length > 0,
  );

  // Step 2: Use refresh token to obtain new tokens
  const refreshResponse = await api.functional.auth.member.refresh(connection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IDiscussionBoardMember.IRefreshRequest,
  });
  typia.assert(refreshResponse);

  // Step 3: Verify new tokens were issued
  TestValidator.predicate(
    "refreshed response should contain new access token",
    refreshResponse.token.access !== null &&
      refreshResponse.token.access !== undefined &&
      refreshResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refreshed response should contain new refresh token",
    refreshResponse.token.refresh !== null &&
      refreshResponse.token.refresh !== undefined &&
      refreshResponse.token.refresh.length > 0,
  );

  // Step 4: Verify token expiration information is present
  TestValidator.predicate(
    "expired_at should be set",
    refreshResponse.token.expired_at !== null &&
      refreshResponse.token.expired_at !== undefined,
  );

  TestValidator.predicate(
    "refreshable_until should be set",
    refreshResponse.token.refreshable_until !== null &&
      refreshResponse.token.refreshable_until !== undefined,
  );
}
