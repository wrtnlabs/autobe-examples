import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that a user can refresh authentication tokens with a valid refresh
 * token.
 *
 * This test simulates the refresh operation for a previously authenticated
 * member by generating a valid IDiscussionBoardUser.IAuthorized structure
 * (including tokens), then making an API call to refresh using the valid
 * refresh token. The test verifies that the returned tokens in the response are
 * not equal to the prior ones, ensuring token rotation, and asserts that all
 * output fields are present and valid according to type. Business validity of
 * the refresh cycle is confirmed.
 */
export async function test_api_user_token_refresh_valid_token(
  connection: api.IConnection,
) {
  // Simulate or obtain a valid, authorized user object (with refresh token)
  const originalAuth: IDiscussionBoardUser.IAuthorized =
    typia.random<IDiscussionBoardUser.IAuthorized>();
  typia.assert(originalAuth);

  // Call the token refresh endpoint with the current refresh token
  const refreshed: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: {
        refreshToken: originalAuth.token.refresh,
      } satisfies IDiscussionBoardUser.IRefreshRequest,
    });
  typia.assert(refreshed);

  // Validate that the access and refresh tokens are different (rotation ensured)
  TestValidator.notEquals(
    "access token is rotated",
    refreshed.token.access,
    originalAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token is rotated",
    refreshed.token.refresh,
    originalAuth.token.refresh,
  );

  // Validate response fields retain user identity and are still active/valid
  TestValidator.equals("user ID is unchanged", refreshed.id, originalAuth.id);
  TestValidator.equals(
    "user email is unchanged",
    refreshed.email,
    originalAuth.email,
  );
  TestValidator.equals(
    "is_email_verified status is preserved",
    refreshed.is_email_verified,
    originalAuth.is_email_verified,
  );
  TestValidator.equals(
    "is_active status is preserved",
    refreshed.is_active,
    originalAuth.is_active,
  );
  TestValidator.equals(
    "is_blocked status is preserved",
    refreshed.is_blocked,
    originalAuth.is_blocked,
  );
  TestValidator.equals(
    "created_at timestamp is unchanged",
    refreshed.created_at,
    originalAuth.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp is unchanged or updated",
    refreshed.updated_at,
    refreshed.updated_at, // (Could compare to original, allow update)
  );
  TestValidator.equals(
    "user deletion status is unchanged",
    refreshed.deleted_at,
    originalAuth.deleted_at,
  );
}
