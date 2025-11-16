import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test the token refresh flow for members using a valid refresh token.
 *
 * This test validates the complete token refresh workflow:
 *
 * 1. Create a new member account through join endpoint to obtain initial tokens
 * 2. Extract the refresh token from the authentication response
 * 3. Use the refresh token to obtain new access and refresh token pairs
 * 4. Verify that new tokens are successfully issued with updated expiration
 *    timestamps
 * 5. Confirm that member identity (ID and username) remains consistent across
 *    refresh
 *
 * This ensures continuous session maintenance without requiring credential
 * re-entry, which is critical for maintaining authenticated sessions in
 * long-running applications.
 */
export async function test_api_member_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to obtain initial authentication tokens
  const joinData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const initialAuth: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinData,
    });
  typia.assert(initialAuth);

  // Step 2: Validate the initial authentication response structure
  TestValidator.predicate(
    "initial auth contains valid access token",
    initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial auth contains valid refresh token",
    initialAuth.token.refresh.length > 0,
  );

  // Step 3: Use the refresh token to obtain new token pairs
  const refreshedAuth: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: initialAuth.token.refresh,
      } satisfies IRedditCommunityGuest.IRefresh,
    });
  typia.assert(refreshedAuth);

  // Step 4: Validate the refreshed authentication response
  TestValidator.predicate(
    "refreshed auth contains new access token",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed auth contains new refresh token",
    refreshedAuth.token.refresh.length > 0,
  );

  // Step 5: Verify that member identity remains consistent
  TestValidator.equals(
    "member ID remains consistent after token refresh",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "member username remains consistent after token refresh",
    refreshedAuth.username,
    initialAuth.username,
  );
  TestValidator.equals(
    "member email remains consistent after token refresh",
    refreshedAuth.email,
    initialAuth.email,
  );

  // Step 6: Verify token expiration timestamps are valid and updated
  const initialExpiredAt = new Date(initialAuth.token.expired_at);
  const refreshedExpiredAt = new Date(refreshedAuth.token.expired_at);
  const initialRefreshableUntil = new Date(initialAuth.token.refreshable_until);
  const refreshedRefreshableUntil = new Date(
    refreshedAuth.token.refreshable_until,
  );

  TestValidator.predicate(
    "refreshed access token expiration is in the future",
    refreshedExpiredAt.getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshed refresh token expiration is in the future",
    refreshedRefreshableUntil.getTime() > Date.now(),
  );
}
