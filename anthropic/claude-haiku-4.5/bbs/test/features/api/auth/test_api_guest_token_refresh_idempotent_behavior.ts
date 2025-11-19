import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test that token refresh is idempotent when called multiple times with the
 * same refresh token.
 *
 * This test validates that the guest token refresh endpoint maintains
 * idempotent behavior, allowing clients to safely retry refresh operations. It
 * registers a guest user, obtains a refresh token, then calls the refresh
 * endpoint multiple times with the identical token.
 *
 * The test verifies:
 *
 * 1. Initial guest registration succeeds and returns valid tokens
 * 2. Multiple refresh calls with the same token all succeed
 * 3. Each refresh response has valid structure and data
 * 4. Session remains stable across repeated refresh operations
 * 5. Clients can safely implement retry logic without side effects
 */
export async function test_api_guest_token_refresh_idempotent_behavior(
  connection: api.IConnection,
) {
  // Step 1: Register a new guest user to obtain initial tokens
  const guestRegistration = await api.functional.auth.guest.join(connection, {
    body: {
      device_identifier: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guestRegistration);

  const refreshToken = guestRegistration.token.refresh;
  const guestId = guestRegistration.id;

  // Step 2: Call refresh endpoint multiple times with the same refresh token
  const refreshCount = 5;
  const refreshResults: IDiscussionBoardGuest.IAuthorized[] = [];

  for (let i = 0; i < refreshCount; i++) {
    const refreshResponse = await api.functional.auth.guest.refresh(
      connection,
      {
        body: {
          refresh_token: refreshToken,
        } satisfies IDiscussionBoardGuest.IRefresh,
      },
    );
    typia.assert(refreshResponse);
    refreshResults.push(refreshResponse);
  }

  TestValidator.predicate(
    "all refresh calls should succeed and return valid responses",
    refreshResults.length === refreshCount,
  );

  // Step 3: Validate idempotency - all responses should have consistent guest ID
  for (let i = 0; i < refreshResults.length; i++) {
    TestValidator.equals(
      `refresh call ${i + 1} should return the same guest ID`,
      refreshResults[i].id,
      guestId,
    );
  }

  // Step 4: Verify all responses have valid access tokens with proper expiration
  for (let i = 0; i < refreshResults.length; i++) {
    TestValidator.predicate(
      `refresh call ${i + 1} should have non-empty access token`,
      refreshResults[i].token.access.length > 0,
    );

    TestValidator.predicate(
      `refresh call ${i + 1} access token should expire in the future`,
      new Date(refreshResults[i].token.expired_at) > new Date(),
    );

    TestValidator.predicate(
      `refresh call ${i + 1} should have non-empty refresh token`,
      refreshResults[i].token.refresh.length > 0,
    );
  }

  // Step 5: Verify session stability - guest ID remains constant across all refreshes
  const allGuestIdsMatch = refreshResults.every(
    (result) => result.id === guestId,
  );
  TestValidator.predicate(
    "all refresh responses should maintain the same guest ID for session stability",
    allGuestIdsMatch,
  );

  // Step 6: Verify continuous idempotency - additional refresh calls should still work
  const additionalRefresh = await api.functional.auth.guest.refresh(
    connection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies IDiscussionBoardGuest.IRefresh,
    },
  );
  typia.assert(additionalRefresh);

  TestValidator.equals(
    "additional refresh call should maintain the same guest ID",
    additionalRefresh.id,
    guestId,
  );

  TestValidator.predicate(
    "additional refresh should return a valid new access token",
    additionalRefresh.token.access.length > 0,
  );

  TestValidator.predicate(
    "additional refresh should return a valid refresh token for future use",
    additionalRefresh.token.refresh.length > 0,
  );
}
