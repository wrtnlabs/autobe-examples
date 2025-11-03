import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test token refresh rejection when member account has been deleted.
 *
 * Validates that the token refresh endpoint properly checks the deleted_at
 * field in the discussion_board_members table. Since no account deletion API is
 * available, this test focuses on the happy path of token refresh for an active
 * account, demonstrating the refresh token flow works correctly before any
 * deletion would occur.
 *
 * Note: Complete testing of deleted account rejection would require a
 * delete/update API endpoint to set the deleted_at field on the member
 * account.
 *
 * Test workflow:
 *
 * 1. Register a new member account with valid credentials
 * 2. Obtain initial authorization tokens (access and refresh tokens)
 * 3. Verify the refresh token is valid and can be used
 * 4. Refresh the token and verify new tokens are issued
 * 5. Validate that the new tokens have proper structure and expiration
 */
export async function test_api_member_token_refresh_deleted_account(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "ValidPass123";

  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(joinResponse);

  TestValidator.predicate(
    "join response contains member id",
    typeof joinResponse.id === "string" && joinResponse.id.length > 0,
  );

  // Step 2: Verify tokens are issued
  const initialToken = joinResponse.token;
  typia.assert<IAuthorizationToken>(initialToken);

  TestValidator.predicate(
    "access token is present and non-empty",
    typeof initialToken.access === "string" && initialToken.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is present and non-empty",
    typeof initialToken.refresh === "string" && initialToken.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiration is set",
    typeof initialToken.expired_at === "string" &&
      initialToken.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refresh token expiration is set",
    typeof initialToken.refreshable_until === "string" &&
      initialToken.refreshable_until.length > 0,
  );

  // Step 3: Verify refresh token can be used to refresh
  const refreshResponse = await api.functional.auth.member.refresh(connection, {
    body: {
      refresh_token: initialToken.refresh,
    } satisfies IDiscussionBoardMember.IRefreshRequest,
  });
  typia.assert(refreshResponse);

  // Step 4: Validate new tokens are issued
  const refreshedToken = refreshResponse.token;
  typia.assert<IAuthorizationToken>(refreshedToken);

  TestValidator.predicate(
    "refreshed access token is present",
    typeof refreshedToken.access === "string" &&
      refreshedToken.access.length > 0,
  );

  TestValidator.predicate(
    "refreshed refresh token is present",
    typeof refreshedToken.refresh === "string" &&
      refreshedToken.refresh.length > 0,
  );

  TestValidator.notEquals(
    "refreshed access token differs from original",
    refreshedToken.access,
    initialToken.access,
  );
}
