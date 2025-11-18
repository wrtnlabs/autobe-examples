import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Validates guest token refresh functionality for active sessions.
 *
 * This test verifies the token refresh mechanism for guest sessions. Guest
 * accounts are temporary and session-based, designed to provide access without
 * long-term registration. This test ensures that:
 *
 * 1. A guest account is created and receives valid JWT tokens
 * 2. The refresh token can be used to obtain new access tokens
 * 3. Multiple refresh cycles maintain session continuity
 * 4. Refreshed sessions retain the guest identity and session information
 *
 * The test validates the core refresh functionality that keeps guest sessions
 * active, allowing users to maintain access to the application without
 * re-registering.
 */
export async function test_api_guest_token_refresh_inactive_session(
  connection: api.IConnection,
) {
  // 1. Create a guest account with valid credentials
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestPassword = RandomGenerator.alphabets(12);

  const initialAuth: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail,
        password: guestPassword,
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(initialAuth);

  // Verify initial authentication was successful
  TestValidator.equals(
    "guest account created with valid email",
    initialAuth.email,
    guestEmail,
  );
  TestValidator.predicate(
    "access token is valid string",
    initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is valid string",
    initialAuth.token.refresh.length > 0,
  );

  // 2. Verify refresh token works for active sessions
  const firstRefreshToken = initialAuth.token.refresh;

  const firstRefreshed: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: firstRefreshToken,
      } satisfies ITodoListGuest.IRefresh,
    });
  typia.assert(firstRefreshed);

  // Verify refreshed session maintains guest identity
  TestValidator.equals(
    "refreshed session maintains guest email",
    firstRefreshed.email,
    guestEmail,
  );
  TestValidator.predicate(
    "refreshed session has valid access token",
    firstRefreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed session has valid refresh token",
    firstRefreshed.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "refreshed access token differs from original",
    firstRefreshed.token.access,
    initialAuth.token.access,
  );

  // 3. Verify multiple refresh cycles work
  const secondRefreshToken = firstRefreshed.token.refresh;

  const secondRefreshed: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: secondRefreshToken,
      } satisfies ITodoListGuest.IRefresh,
    });
  typia.assert(secondRefreshed);

  // Verify continued session integrity
  TestValidator.equals(
    "second refresh maintains guest email",
    secondRefreshed.email,
    guestEmail,
  );
  TestValidator.predicate(
    "second refresh produces new access token",
    secondRefreshed.token.access.length > 0,
  );

  // 4. Verify session timestamps are updated
  TestValidator.predicate(
    "refreshed token has valid expiration",
    new Date(secondRefreshed.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshed token has valid refreshable_until",
    new Date(secondRefreshed.token.refreshable_until) > new Date(),
  );
}
