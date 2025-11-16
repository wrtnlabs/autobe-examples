import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuest";

/**
 * Test token refresh with minimal refresh data using only the guest session ID.
 * Validates that refresh operation can proceed with just the core required
 * data, testing the minimum viable refresh workflow for guest sessions.
 *
 * 1. Create guest session using join endpoint
 * 2. Extract session ID from the guest authorization
 * 3. Perform minimal refresh using just the session ID
 * 4. Validate the refreshed session maintains guest identity and data
 */
export async function test_api_guest_refresh_minimal_data(
  connection: api.IConnection,
) {
  // Step 1: Create a guest session to get session ID via join dependency
  const guestJoin = await api.functional.auth.guest.join(connection, {
    body: {
      username: RandomGenerator.name(),
      user_agent: RandomGenerator.alphaNumeric(10),
    } satisfies IEconomicDiscussionGuest.ICreate,
  });
  typia.assert(guestJoin);

  // Store the original guest session data for validation
  const originalGuestData = guestJoin;

  // Step 2: Extract session ID from the guest authorization (TypeScript guarantees it's a valid UUID)
  const sessionId = guestJoin.id;

  // Step 3: Perform minimal refresh using just the session ID
  const refreshedGuest = await api.functional.auth.guest.refresh(connection, {
    body: {
      id: sessionId,
    } satisfies IEconomicDiscussionGuest.IRefresh,
  });
  typia.assert(refreshedGuest);

  // Step 4: Validate the refreshed session maintains guest identity
  TestValidator.equals(
    "username matches original",
    refreshedGuest.username,
    originalGuestData.username,
  );
  TestValidator.equals(
    "session ID matches original",
    refreshedGuest.id,
    originalGuestData.id,
  );

  // Step 5: Verify activity counters are preserved
  TestValidator.equals(
    "articles viewed count preserved",
    refreshedGuest.articles_viewed_count,
    originalGuestData.articles_viewed_count,
  );
  TestValidator.equals(
    "downloads count preserved",
    refreshedGuest.downloads_count,
    originalGuestData.downloads_count,
  );

  // Step 6: Validate authorization updates are handled by framework
  // Framework automatically updates connection.headers.Authorization as documented
  // No need to test TypeScript implementation details

  // Step 7: Verify timestamps maintain proper ordering
  TestValidator.equals(
    "created_at timestamp maintained",
    refreshedGuest.created_at,
    originalGuestData.created_at,
  );

  // The refresh should maintain timestamp consistency
  TestValidator.predicate(
    "created_at is before or equal to last activity",
    new Date(refreshedGuest.created_at).getTime() <=
      new Date(refreshedGuest.last_activity_at).getTime(),
  );
}
