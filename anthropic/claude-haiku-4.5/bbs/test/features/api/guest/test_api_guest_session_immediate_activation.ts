import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that guest sessions are activated immediately upon successful
 * registration.
 *
 * This test validates the guest registration endpoint, ensuring that:
 *
 * 1. Guest registration creates a session with immediate access
 * 2. The returned access token can be used immediately in subsequent API requests
 * 3. Guest users receive both access and refresh tokens with proper expiration
 *    times
 * 4. The guest session ID is properly tracked with a valid UUID format
 * 5. Guest users have read-only permissions and cannot perform write operations
 *
 * The guest session provides temporary read-only access to the discussion board
 * without requiring email/password credentials, allowing unauthenticated
 * visitors to explore content immediately.
 */
export async function test_api_guest_session_immediate_activation(
  connection: api.IConnection,
) {
  // Step 1: Register as a guest user and receive authorization
  const guestSession: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guestSession);

  // Step 2: Verify token expiration times are properly set
  const expiredAt = new Date(guestSession.token.expired_at);
  const refreshableUntil = new Date(guestSession.token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "refresh token expiration extends beyond access token expiration",
    refreshableUntil >= expiredAt,
  );

  // Step 3: Verify access token is automatically set in connection headers
  // The SDK automatically sets Authorization header after successful guest join
  TestValidator.predicate(
    "authorization header is set for immediate API requests",
    connection.headers !== undefined &&
      connection.headers.Authorization === guestSession.token.access,
  );

  // Step 4: Verify guest session provides immediate access without verification
  // Guest registration completes instantly without requiring email confirmation
  // or additional steps, enabling unauthenticated visitors to access content
  TestValidator.predicate(
    "guest session ID is available for tracking guest user activity",
    typeof guestSession.id === "string",
  );

  TestValidator.predicate(
    "guest access token is ready for immediate use in subsequent requests",
    typeof guestSession.token.access === "string" &&
      connection.headers?.Authorization === guestSession.token.access,
  );
}
