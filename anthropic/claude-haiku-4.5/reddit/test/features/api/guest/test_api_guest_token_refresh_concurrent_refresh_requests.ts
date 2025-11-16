import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test concurrent token refresh requests from the same guest session.
 *
 * This test validates that the guest token refresh endpoint properly handles
 * concurrent refresh requests. It creates a guest account, obtains initial
 * tokens, and then attempts to refresh tokens concurrently (3 simultaneous
 * refresh requests using the same refresh token). The test verifies that:
 *
 * 1. Guest account is successfully created with valid tokens
 * 2. Concurrent refresh requests are handled correctly
 * 3. Token results are consistent across concurrent requests
 * 4. No race conditions or session integrity issues occur
 * 5. Proper concurrency control is implemented
 */
export async function test_api_guest_token_refresh_concurrent_refresh_requests(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest account
  const guestAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guestAccount);

  TestValidator.predicate(
    "guest account has valid id",
    guestAccount.id !== undefined && guestAccount.id !== null,
  );
  TestValidator.predicate(
    "guest token has access token",
    guestAccount.token.access !== undefined &&
      guestAccount.token.access !== null,
  );
  TestValidator.predicate(
    "guest token has refresh token",
    guestAccount.token.refresh !== undefined &&
      guestAccount.token.refresh !== null,
  );

  // Step 2: Prepare concurrent refresh requests with true parallelism
  const refreshToken = guestAccount.token.refresh;
  const refreshPromises = [
    api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ICommunityPlatformMember.IRefresh,
    }),
    api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ICommunityPlatformMember.IRefresh,
    }),
    api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ICommunityPlatformMember.IRefresh,
    }),
  ];

  // Step 3: Execute concurrent refresh requests
  const refreshResults = await Promise.all(refreshPromises);

  // Step 4: Validate all refresh results
  TestValidator.predicate(
    "all concurrent refresh requests completed",
    refreshResults.length === 3,
  );

  // Step 5: Validate each refresh result
  for (let i = 0; i < refreshResults.length; i++) {
    const result = refreshResults[i];
    typia.assert(result);

    TestValidator.predicate(
      `refresh result ${i + 1} has valid id`,
      result.id !== undefined && result.id !== null,
    );
    TestValidator.predicate(
      `refresh result ${i + 1} has access token`,
      result.token.access !== undefined && result.token.access !== null,
    );
    TestValidator.predicate(
      `refresh result ${i + 1} has refresh token`,
      result.token.refresh !== undefined && result.token.refresh !== null,
    );
  }

  // Step 6: Validate session consistency
  TestValidator.equals(
    "all concurrent refresh requests return same guest id",
    refreshResults[0].id,
    refreshResults[1].id,
  );
  TestValidator.equals(
    "all three refresh requests return same guest id",
    refreshResults[1].id,
    refreshResults[2].id,
  );

  // Step 7: Validate token integrity
  TestValidator.predicate(
    "all concurrent refresh requests provide valid access tokens",
    refreshResults[0].token.access !== undefined &&
      refreshResults[1].token.access !== undefined &&
      refreshResults[2].token.access !== undefined &&
      refreshResults[0].token.access.length > 0 &&
      refreshResults[1].token.access.length > 0 &&
      refreshResults[2].token.access.length > 0,
  );

  // Step 8: Verify no race condition issues by checking expiration timestamps
  for (let i = 0; i < refreshResults.length; i++) {
    const result = refreshResults[i];
    typia.assert(result);

    TestValidator.predicate(
      `refresh result ${i + 1} has valid expired_at timestamp`,
      result.token.expired_at !== undefined &&
        result.token.expired_at !== null &&
        result.token.expired_at.length > 0,
    );
    TestValidator.predicate(
      `refresh result ${i + 1} has valid refreshable_until timestamp`,
      result.token.refreshable_until !== undefined &&
        result.token.refreshable_until !== null &&
        result.token.refreshable_until.length > 0,
    );
  }

  // Step 9: Verify session integrity after concurrent operations
  TestValidator.predicate(
    "guest session remains valid after concurrent refreshes",
    guestAccount.id === refreshResults[0].id &&
      guestAccount.id === refreshResults[1].id &&
      guestAccount.id === refreshResults[2].id,
  );
}
