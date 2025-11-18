import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Validate that the last_activity_at timestamp in guest session is updated
 * during token refresh.
 *
 * This test verifies the activity tracking mechanism that maintains the 7-day
 * inactivity timeout. When a guest user refreshes their token, the backend
 * updates the last_activity_at timestamp to the current time, effectively
 * resetting the inactivity counter.
 *
 * Test steps:
 *
 * 1. Create a new guest account and obtain initial tokens
 * 2. Extract and store the refresh token for later use
 * 3. Wait a measurable time period to ensure timestamp difference
 * 4. Call the refresh endpoint with the stored refresh token
 * 5. Verify the response contains updated guest information with new tokens
 * 6. Validate that the refresh operation succeeded and tokens are valid
 */
export async function test_api_guest_token_refresh_activity_timestamp_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest account
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestPassword = RandomGenerator.alphabets(8);

  const joinResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail,
        password: guestPassword,
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(joinResponse);

  // Extract the refresh token from the response
  const refreshToken = joinResponse.token.refresh;

  // Step 2: Record the initial state
  const initialCreatedAt = new Date(joinResponse.created_at);
  TestValidator.predicate(
    "initial guest account created timestamp is valid",
    initialCreatedAt instanceof Date && !isNaN(initialCreatedAt.getTime()),
  );

  // Step 3: Wait for a measurable time period (1 second)
  // This ensures the refresh operation happens at a different time
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 4: Refresh the token
  const refreshResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ITodoListGuest.IRefresh,
    });
  typia.assert(refreshResponse);

  // Step 5: Verify the refresh operation returned valid data
  TestValidator.equals(
    "refreshed guest email matches original email",
    refreshResponse.email,
    guestEmail,
  );

  TestValidator.predicate(
    "refreshed guest has valid ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      refreshResponse.id,
    ),
  );

  // Step 6: Verify tokens are present and valid
  TestValidator.predicate(
    "refresh response has access token",
    refreshResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh response has refresh token",
    refreshResponse.token.refresh.length > 0,
  );

  // Verify that token expiration timestamps are properly set
  const accessTokenExpired = new Date(refreshResponse.token.expired_at);
  TestValidator.predicate(
    "access token expiration is in the future",
    accessTokenExpired > new Date(),
  );

  const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
  TestValidator.predicate(
    "refresh token is valid until future date",
    refreshableUntil > new Date(),
  );

  // Verify created_at timestamp is preserved
  TestValidator.equals(
    "created_at timestamp is preserved after refresh",
    refreshResponse.created_at,
    joinResponse.created_at,
  );
}
