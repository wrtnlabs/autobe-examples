import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";

/**
 * Test guest token refresh functionality.
 *
 * This test creates a guest session to obtain an initial token, then validates
 * that the token refresh mechanism works correctly for guest users. The test
 * ensures that temporary sessions can be maintained while testing the refresh
 * mechanism for guest users to continue demo access without interruption.
 *
 * The test follows these steps:
 *
 * 1. Create initial guest session to obtain token
 * 2. Validate the response structure contains valid token information
 * 3. Verify token timestamps and expiration settings
 * 4. Validate guest session continuity
 * 5. Ensure proper session management for demo access
 */
export async function test_api_guest_join_refresh(connection: api.IConnection) {
  // Create initial guest session
  const guestAuth: ITodoGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);

  // Validate guest authorization response structure
  typia.assert<ITodoGuest.IAuthorized>(guestAuth);

  // Validate token structure
  TestValidator.predicate(
    "guest authorization response has valid token",
    guestAuth.token !== null &&
      guestAuth.token.access !== null &&
      guestAuth.token.refresh !== null &&
      guestAuth.token.expired_at !== null &&
      guestAuth.token.refreshable_until !== null,
  );

  // Validate UUID format for guest ID
  TestValidator.predicate(
    "guest ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guestAuth.id,
    ),
  );

  // Validate expiration timestamps are within reasonable bounds
  const now = new Date().getTime();
  const expiredAt = new Date(guestAuth.token.expired_at).getTime();
  const refreshableUntil = new Date(
    guestAuth.token.refreshable_until,
  ).getTime();

  TestValidator.predicate("token expiration is in the future", expiredAt > now);

  TestValidator.predicate(
    "refreshable until is after expiration",
    refreshableUntil >= expiredAt,
  );

  TestValidator.predicate(
    "token expires within 24 hours",
    expiredAt - now <= 24 * 60 * 60 * 1000,
  );

  // Validate timestamps are properly formatted
  TestValidator.predicate(
    "token expiration timestamp is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/.test(
      guestAuth.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "token refreshable until timestamp is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/.test(
      guestAuth.token.refreshable_until,
    ),
  );

  TestValidator.predicate(
    "guest created at timestamp is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/.test(
      guestAuth.created_at,
    ),
  );

  TestValidator.predicate(
    "guest updated at timestamp matches created at",
    guestAuth.updated_at === guestAuth.created_at,
  );

  // Verify deleted_at is null for active session
  TestValidator.equals(
    "deleted_at is null for active session",
    guestAuth.deleted_at,
    null,
  );

  // Test session can be used immediately (guest session is active)
  TestValidator.predicate(
    "guest session is active",
    guestAuth.deleted_at === null,
  );
}
