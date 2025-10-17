import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";

/**
 * Test the guest session token refresh mechanism for session continuity.
 *
 * This test validates that guest users can refresh their access tokens using a
 * valid refresh token without needing to re-register. The test creates a new
 * guest account, obtains the initial tokens, then uses the refresh token to
 * request a new access token. It verifies that the refresh operation succeeds
 * and returns valid session information with updated token expiration times.
 *
 * Steps:
 *
 * 1. Create a new guest account through the join endpoint
 * 2. Verify the initial authorization response contains valid tokens
 * 3. Use the refresh token to obtain a new access token
 * 4. Verify the refreshed response contains updated tokens
 * 5. Validate that session information is consistent
 */
export async function test_api_guest_token_refresh_session_continuity(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest account to obtain initial tokens
  const initialGuest: IRedditLikeGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        ip_address: "192.168.1.100",
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      } satisfies IRedditLikeGuest.ICreate,
    });
  typia.assert(initialGuest);

  // Step 2: Verify the initial guest authorization contains all required fields
  TestValidator.predicate(
    "initial guest has valid UUID",
    typia.is<string & tags.Format<"uuid">>(initialGuest.id),
  );
  TestValidator.predicate(
    "initial guest has session identifier",
    initialGuest.session_identifier.length > 0,
  );
  TestValidator.equals(
    "initial guest role is guest",
    initialGuest.role,
    "guest",
  );
  TestValidator.predicate(
    "initial access token exists",
    initialGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token exists",
    initialGuest.token.refresh.length > 0,
  );

  // Store the initial refresh token for the refresh request
  const refreshToken = initialGuest.token.refresh;

  // Step 3: Use the refresh token to obtain a new access token
  const refreshedGuest: IRedditLikeGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IRedditLikeGuest.IRefresh,
    });
  typia.assert(refreshedGuest);

  // Step 4: Verify the refreshed response contains updated tokens
  TestValidator.predicate(
    "refreshed access token exists",
    refreshedGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed access token is different from initial",
    refreshedGuest.token.access !== initialGuest.token.access,
  );
  TestValidator.predicate(
    "refreshed token has valid expiration",
    refreshedGuest.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed token has valid refreshable_until",
    refreshedGuest.token.refreshable_until.length > 0,
  );

  // Step 5: Verify session consistency
  TestValidator.equals(
    "guest ID remains the same after refresh",
    refreshedGuest.id,
    initialGuest.id,
  );
  TestValidator.equals(
    "session identifier remains the same after refresh",
    refreshedGuest.session_identifier,
    initialGuest.session_identifier,
  );
  TestValidator.equals(
    "role remains guest after refresh",
    refreshedGuest.role,
    "guest",
  );
  TestValidator.predicate(
    "last visit timestamp is updated",
    new Date(refreshedGuest.last_visit_at).getTime() >=
      new Date(initialGuest.last_visit_at).getTime(),
  );
}
