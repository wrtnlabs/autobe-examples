import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

/**
 * Test successful guest session refresh with a valid session token.
 *
 * This test validates that guest sessions can be refreshed successfully,
 * generating new authentication tokens while preserving session context. It
 * ensures that refreshed sessions maintain the same guest identity and browsing
 * context without requiring re-authentication.
 */
export async function test_api_guest_session_refresh_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session
  const initialGuest = await api.functional.auth.guest.join(connection, {
    body: {
      session_token: undefined,
    } satisfies ICommunityPlatformGuest.ICreate,
  });
  typia.assert(initialGuest);

  // Step 2: Refresh the guest session using the valid session token
  const refreshedGuest = await api.functional.auth.guest.refresh(connection, {
    body: {
      session_token: initialGuest.session_token,
    } satisfies ICommunityPlatformGuest.IRefresh,
  });
  typia.assert(refreshedGuest);

  // Step 3: Verify guest identity continuity
  TestValidator.equals(
    "guest ID remains consistent after refresh",
    refreshedGuest.id,
    initialGuest.id,
  );

  // Step 4: Validate session token continuity
  TestValidator.equals(
    "session token remains consistent after refresh",
    refreshedGuest.session_token,
    initialGuest.session_token,
  );

  // Step 5: Verify timestamp updates
  const initialUpdatedAt = typia.assert(initialGuest.updated_at!);
  const refreshedUpdatedAt = typia.assert(refreshedGuest.updated_at!);

  TestValidator.predicate(
    "updated_at timestamp is newer after refresh",
    new Date(refreshedUpdatedAt) > new Date(initialUpdatedAt),
  );

  // Step 6: Validate that created_at timestamp remains unchanged
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    refreshedGuest.created_at,
    initialGuest.created_at,
  );

  // Step 7: Verify new authentication tokens are generated
  TestValidator.notEquals(
    "access token is refreshed",
    refreshedGuest.token.access,
    initialGuest.token.access,
  );

  TestValidator.notEquals(
    "refresh token is refreshed",
    refreshedGuest.token.refresh,
    initialGuest.token.refresh,
  );

  // Step 8: Verify that deleted_at remains undefined for active sessions
  TestValidator.equals(
    "deleted_at remains undefined for active session",
    refreshedGuest.deleted_at,
    undefined,
  );
}
