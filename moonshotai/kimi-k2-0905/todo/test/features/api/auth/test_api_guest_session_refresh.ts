import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";

export async function test_api_guest_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest session for refresh testing
  const initialGuest: ITodoGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(initialGuest);

  // Extract original session details for comparison
  const originalSessionId = initialGuest.id;
  const originalSessionIdentifier = initialGuest.session_identifier;
  const originalAccessToken = initialGuest.token.access;
  const originalRefreshToken = initialGuest.token.refresh;
  const originalExpiredAt = initialGuest.token.expired_at;
  const originalRefreshableUntil = initialGuest.token.refreshable_until;

  // Step 2: Refresh guest session to extend demonstration access
  const refreshedGuest: ITodoGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection);
  typia.assert(refreshedGuest);

  // Step 3: Validate session refresh maintains continuous access
  // Verify session identifiers are preserved (same guest identity)
  TestValidator.equals(
    "guest ID remains consistent",
    refreshedGuest.id,
    originalSessionId,
  );
  TestValidator.equals(
    "session identifier unchanged",
    refreshedGuest.session_identifier,
    originalSessionIdentifier,
  );

  // Step 4: Validate updated token information
  // Access token should be different (renewed)
  TestValidator.notEquals(
    "access token updated on refresh",
    refreshedGuest.token.access,
    originalAccessToken,
  );

  // Refresh token should be different (renewed)
  TestValidator.notEquals(
    "refresh token updated on refresh",
    refreshedGuest.token.refresh,
    originalRefreshToken,
  );

  // Step 5: Validate timestamps are updated (extended session lifetime)
  // Both tokens should have later expiration times
  TestValidator.predicate(
    "access token expired_at is newer",
    refreshedGuest.token.expired_at > originalExpiredAt,
  );
  TestValidator.predicate(
    "refresh token refreshable_until is newer",
    refreshedGuest.token.refreshable_until > originalRefreshableUntil,
  );

  // Step 6: Verify authorization header is automatically updated
  // SDK automatically updates connection.headers.Authorization with new access token
  TestValidator.predicate(
    "authorization header contains new access token",
    connection.headers?.Authorization === refreshedGuest.token.access,
  );
}
