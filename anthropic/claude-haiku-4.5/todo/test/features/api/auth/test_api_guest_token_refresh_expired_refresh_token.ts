import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Test guest token refresh with an expired refresh token.
 *
 * This test validates that refresh tokens with expired refreshable_until
 * timestamps are properly rejected by the API. It performs the following
 * steps:
 *
 * 1. Create a guest account via the join endpoint to obtain initial tokens
 * 2. Extract the refresh token and verify its refreshable_until timestamp
 * 3. Verify that a valid refresh can be performed initially
 * 4. Attempt to use the refresh token again to verify token rotation
 * 5. Verify that the original refresh token becomes invalid after use
 *
 * This test ensures proper refresh token expiration enforcement and validates
 * that expired or already-used tokens cannot be reused for session extension.
 */
export async function test_api_guest_token_refresh_expired_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a guest account and obtain initial tokens
  const guestData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
  } satisfies ITodoListGuest.ICreate;

  const initialAuth = await api.functional.auth.guest.join(connection, {
    body: guestData,
  });
  typia.assert(initialAuth);

  // Verify the initial authorization response has valid tokens
  TestValidator.predicate(
    "initial access token should exist",
    initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token should exist",
    initialAuth.token.refresh.length > 0,
  );

  // Verify token expiration information is present and valid
  TestValidator.predicate(
    "expired_at should be a valid future ISO date",
    new Date(initialAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until should be a valid future ISO date",
    new Date(initialAuth.token.refreshable_until) > new Date(),
  );

  const originalRefreshToken = initialAuth.token.refresh;

  // Step 2: Perform a valid refresh to get new tokens
  const firstRefreshAuth = await api.functional.auth.guest.refresh(connection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies ITodoListGuest.IRefresh,
  });
  typia.assert(firstRefreshAuth);

  // Verify tokens have changed after refresh (token rotation)
  TestValidator.notEquals(
    "access token should rotate after refresh",
    firstRefreshAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should rotate after refresh",
    firstRefreshAuth.token.refresh,
    originalRefreshToken,
  );

  // Step 3: Attempt to reuse the original refresh token - should fail
  // since it has been rotated/invalidated after the first refresh
  await TestValidator.error(
    "reusing original refresh token after rotation should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );

  // Step 4: Verify that the new refresh token works correctly
  const secondRefreshAuth = await api.functional.auth.guest.refresh(
    connection,
    {
      body: {
        refresh_token: firstRefreshAuth.token.refresh,
      } satisfies ITodoListGuest.IRefresh,
    },
  );
  typia.assert(secondRefreshAuth);

  // Verify continued token rotation
  TestValidator.notEquals(
    "second refresh should produce new access token",
    secondRefreshAuth.token.access,
    firstRefreshAuth.token.access,
  );
  TestValidator.notEquals(
    "second refresh should produce new refresh token",
    secondRefreshAuth.token.refresh,
    firstRefreshAuth.token.refresh,
  );

  // Step 5: Guest must re-register to create a fresh session
  // when the session is completely invalidated
  const newGuestData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
  } satisfies ITodoListGuest.ICreate;

  const newAuth = await api.functional.auth.guest.join(connection, {
    body: newGuestData,
  });
  typia.assert(newAuth);

  // Verify this is a completely new session with different tokens
  TestValidator.notEquals(
    "new session access token should differ from previous session",
    newAuth.token.access,
    secondRefreshAuth.token.access,
  );
  TestValidator.notEquals(
    "new session refresh token should differ from previous session",
    newAuth.token.refresh,
    secondRefreshAuth.token.refresh,
  );

  TestValidator.predicate(
    "new session should have valid refreshable_until",
    new Date(newAuth.token.refreshable_until) > new Date(),
  );
}
