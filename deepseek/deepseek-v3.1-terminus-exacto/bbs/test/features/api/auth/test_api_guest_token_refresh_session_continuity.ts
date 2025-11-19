import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test session continuity during guest token refresh operations.
 *
 * This test validates that guest sessions remain active and uninterrupted
 * during token refresh cycles. It creates a guest account, performs multiple
 * refresh operations in sequence, and verifies that each refresh generates new
 * authentication tokens while maintaining the same guest identity. The test
 * ensures that the guest record persists across refresh operations with proper
 * timestamp updates, supporting seamless anonymous browsing experience.
 */
export async function test_api_guest_token_refresh_session_continuity(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session
  const initialGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(initialGuest);

  // Step 2: Perform first token refresh
  const firstRefresh: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection);
  typia.assert(firstRefresh);

  // Step 3: Validate session continuity
  TestValidator.equals(
    "guest ID remains consistent",
    firstRefresh.id,
    initialGuest.id,
  );
  TestValidator.equals(
    "guest_token remains immutable",
    firstRefresh.guest_token,
    initialGuest.guest_token,
  );
  TestValidator.notEquals(
    "access token should be rotated",
    firstRefresh.token.access,
    initialGuest.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    firstRefresh.token.refresh,
    initialGuest.token.refresh,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(firstRefresh.updated_at) > new Date(initialGuest.updated_at),
  );

  // Step 4: Perform second token refresh
  const secondRefresh: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection);
  typia.assert(secondRefresh);

  // Step 5: Validate continued session continuity
  TestValidator.equals(
    "guest ID remains consistent across multiple refreshes",
    secondRefresh.id,
    initialGuest.id,
  );
  TestValidator.equals(
    "guest_token remains immutable across multiple refreshes",
    secondRefresh.guest_token,
    initialGuest.guest_token,
  );
  TestValidator.notEquals(
    "access token should be rotated again",
    secondRefresh.token.access,
    firstRefresh.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated again",
    secondRefresh.token.refresh,
    firstRefresh.token.refresh,
  );
  TestValidator.predicate(
    "updated_at should be newer after second refresh",
    new Date(secondRefresh.updated_at) > new Date(firstRefresh.updated_at),
  );

  // Step 6: Validate token expiration timestamps are properly set
  TestValidator.predicate(
    "access token expiration should be in the future",
    new Date(secondRefresh.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    new Date(secondRefresh.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "refresh token should have longer validity than access token",
    new Date(secondRefresh.token.refreshable_until) >
      new Date(secondRefresh.token.expired_at),
  );
}
