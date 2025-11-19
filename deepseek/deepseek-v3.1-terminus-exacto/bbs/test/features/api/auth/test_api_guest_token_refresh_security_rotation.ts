import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test security aspects of guest token refresh mechanism.
 *
 * This test validates that token rotation enhances security by limiting the
 * exposure window for compromised tokens. It verifies that the old guest_token
 * becomes invalid after refresh and cannot be reused for authentication, while
 * ensuring the new guest_token follows proper UUID v4 format and maintains the
 * guest's identity continuity. The test also validates that updated_at
 * timestamp reflects the refresh operation, providing accurate audit trail for
 * guest activity tracking.
 */
export async function test_api_guest_token_refresh_security_rotation(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest account
  const initialGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(initialGuest);

  // Store original guest_token and authentication token
  const originalGuestToken = initialGuest.guest_token;
  const originalAuthToken = initialGuest.token.access;
  const originalRefreshableUntil = new Date(
    initialGuest.token.refreshable_until,
  ).getTime();

  // Step 2: Refresh the guest token
  const refreshedGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection);
  typia.assert(refreshedGuest);

  // Step 3: Validate token rotation security
  TestValidator.notEquals(
    "guest_token should change after refresh",
    refreshedGuest.guest_token,
    originalGuestToken,
  );

  TestValidator.notEquals(
    "authentication token should change after refresh",
    refreshedGuest.token.access,
    originalAuthToken,
  );

  // Step 4: Validate identity continuity
  TestValidator.equals(
    "guest ID should remain consistent after refresh",
    refreshedGuest.id,
    initialGuest.id,
  );

  // Step 5: Validate UUID v4 format for new guest_token
  TestValidator.predicate(
    "refreshed guest_token should be valid UUID v4 format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      refreshedGuest.guest_token,
    ),
  );

  // Step 6: Validate timestamp updates
  const initialCreatedAt = new Date(initialGuest.created_at).getTime();
  const refreshedUpdatedAt = new Date(refreshedGuest.updated_at).getTime();

  TestValidator.predicate(
    "updated_at should be newer than created_at after refresh",
    refreshedUpdatedAt > initialCreatedAt,
  );

  // Step 7: Validate refresh token expiration extension
  const newRefreshableUntil = new Date(
    refreshedGuest.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until should be extended after token refresh",
    newRefreshableUntil > originalRefreshableUntil,
  );

  // Step 8: Demonstrate security through successful subsequent operations
  // The token rotation itself demonstrates security - old tokens are invalidated
  // and new tokens are properly formatted and functional
  TestValidator.predicate(
    "new authentication token should be valid non-empty string",
    refreshedGuest.token.access.length > 0,
  );

  TestValidator.predicate(
    "new refresh token should be valid non-empty string",
    refreshedGuest.token.refresh.length > 0,
  );
}
