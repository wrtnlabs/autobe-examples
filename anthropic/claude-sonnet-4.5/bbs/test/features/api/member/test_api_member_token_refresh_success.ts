import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member authentication token refresh workflow.
 *
 * This test validates that a member can obtain new access and refresh tokens
 * using a valid refresh token without re-entering credentials. The test ensures
 * that the token refresh mechanism works correctly and returns valid, updated
 * authentication tokens.
 *
 * Test Steps:
 *
 * 1. Create a new member account via join endpoint to obtain initial tokens
 * 2. Extract the refresh token from the join response
 * 3. Use the refresh token to call the refresh endpoint
 * 4. Validate that new tokens are issued successfully
 * 5. Verify the response contains valid access token, refresh token, and
 *    expiration timestamps
 * 6. Ensure the new tokens differ from the original tokens
 * 7. Confirm token expiration times are set appropriately in the future
 * 8. Verify member information matches between join and refresh responses
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to obtain initial tokens
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const initialMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(initialMember);

  // Step 2: Extract the refresh token from initial authentication
  const initialRefreshToken = initialMember.token.refresh;
  const initialAccessToken = initialMember.token.access;

  // Step 3: Call the refresh endpoint with the refresh token
  const refreshedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  typia.assert(refreshedMember);

  // Step 4 & 5: Validate that new tokens are issued with all required fields
  TestValidator.predicate(
    "refreshed response contains access token",
    refreshedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed response contains refresh token",
    refreshedMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed response contains expired_at timestamp",
    refreshedMember.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed response contains refreshable_until timestamp",
    refreshedMember.token.refreshable_until.length > 0,
  );

  // Step 6: Ensure the new tokens differ from the original tokens
  TestValidator.notEquals(
    "new access token differs from original",
    refreshedMember.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshedMember.token.refresh,
    initialRefreshToken,
  );

  // Step 7: Confirm token expiration times are in the future
  const now = new Date();
  const expiredAt = new Date(refreshedMember.token.expired_at);
  const refreshableUntil = new Date(refreshedMember.token.refreshable_until);

  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );

  // Step 8: Verify member information matches between join and refresh responses
  TestValidator.equals(
    "member id matches original",
    refreshedMember.id,
    initialMember.id,
  );
  TestValidator.equals(
    "member username matches original",
    refreshedMember.username,
    initialMember.username,
  );
  TestValidator.equals(
    "member email matches original",
    refreshedMember.email,
    initialMember.email,
  );
  TestValidator.equals(
    "member status matches original",
    refreshedMember.status,
    initialMember.status,
  );
  TestValidator.equals(
    "email verification status matches original",
    refreshedMember.email_verified,
    initialMember.email_verified,
  );
}
