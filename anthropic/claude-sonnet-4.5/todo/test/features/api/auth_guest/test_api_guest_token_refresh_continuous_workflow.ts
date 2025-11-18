import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test the complete continuous token refresh workflow simulating long-lived
 * guest sessions.
 *
 * This test validates that guest users can maintain authenticated sessions
 * indefinitely through consecutive token refresh operations. The test performs
 * the following steps:
 *
 * 1. Register a new guest user to obtain initial JWT token pair
 * 2. Perform 5 consecutive token refresh operations
 * 3. Each refresh uses the most recently issued refresh token
 * 4. Validate that each refresh succeeds and returns valid new token pairs
 * 5. Confirm token chain works correctly with proper token rotation
 * 6. Verify expiration timestamps are extended with each refresh
 *
 * This ensures guests can maintain sessions as long as they refresh before
 * expiration, enabling long-lived authenticated sessions without
 * re-authentication.
 */
export async function test_api_guest_token_refresh_continuous_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register a new guest user to obtain initial tokens
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    href: "https://todo-app.example.com/register",
    referrer: "https://todo-app.example.com/home",
  } satisfies ITodoListGuest.ICreate;

  const initialAuth: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationData,
    });
  typia.assert(initialAuth);

  // Track token state across refreshes
  let currentRefreshToken = initialAuth.token.refresh;
  let currentUserId = initialAuth.id;
  let previousExpiredAt = new Date(initialAuth.token.expired_at);
  let previousRefreshableUntil = new Date(initialAuth.token.refreshable_until);

  // Step 2: Perform 5 consecutive token refresh operations
  const refreshCount = 5;

  for (let i = 1; i <= refreshCount; i++) {
    // Perform token refresh using the current refresh token
    const refreshedAuth: ITodoListGuest.IAuthorized =
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: currentRefreshToken,
        } satisfies ITodoListGuest.IRefresh,
      });
    typia.assert(refreshedAuth);

    // Step 3: Validate that refresh succeeded and returned valid token pair
    TestValidator.equals(
      `refresh iteration ${i}: user ID remains consistent`,
      refreshedAuth.id,
      currentUserId,
    );

    // Step 4: Verify that new refresh token is different from previous
    TestValidator.notEquals(
      `refresh iteration ${i}: new refresh token differs from previous`,
      refreshedAuth.token.refresh,
      currentRefreshToken,
    );

    // Step 5: Validate expiration timestamps are extended
    const newExpiredAt = new Date(refreshedAuth.token.expired_at);
    const newRefreshableUntil = new Date(refreshedAuth.token.refreshable_until);

    TestValidator.predicate(
      `refresh iteration ${i}: expired_at timestamp is extended`,
      newExpiredAt.getTime() > previousExpiredAt.getTime(),
    );
    TestValidator.predicate(
      `refresh iteration ${i}: refreshable_until timestamp is extended`,
      newRefreshableUntil.getTime() > previousRefreshableUntil.getTime(),
    );

    // Update state for next iteration
    currentRefreshToken = refreshedAuth.token.refresh;
    previousExpiredAt = newExpiredAt;
    previousRefreshableUntil = newRefreshableUntil;
  }

  // Step 6: Validate that old refresh tokens are properly invalidated
  // Attempt to use the initial refresh token (should fail as it's been rotated out)
  await TestValidator.error(
    "old refresh token is invalidated after rotation",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: initialAuth.token.refresh,
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );
}
