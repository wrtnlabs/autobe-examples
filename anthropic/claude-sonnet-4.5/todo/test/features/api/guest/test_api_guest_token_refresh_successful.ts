import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test successful JWT token refresh workflow for an authenticated guest user.
 *
 * This test validates the complete token refresh flow including:
 *
 * 1. Initial guest registration to obtain tokens
 * 2. Using the refresh token to get new access and refresh tokens
 * 3. Verifying token rotation (new tokens differ from old ones)
 * 4. Confirming extended expiration timestamps
 * 5. Ensuring user ID consistency across refresh operations
 */
export async function test_api_guest_token_refresh_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new guest user to obtain initial tokens
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies ITodoListGuest.ICreate;

  const initialAuth: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationBody,
    });
  typia.assert(initialAuth);

  // Step 2: Store initial token data for comparison
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = new Date(initialAuth.token.expired_at);
  const initialRefreshableUntil = new Date(initialAuth.token.refreshable_until);

  // Step 3: Call the refresh endpoint with the refresh token
  const refreshBody = {
    refresh_token: initialRefreshToken,
  } satisfies ITodoListGuest.IRefresh;

  const refreshedAuth: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, { body: refreshBody });
  typia.assert(refreshedAuth);

  // Step 4: Validate the refresh response
  TestValidator.equals(
    "user ID should remain the same after refresh",
    refreshedAuth.id,
    initialAuth.id,
  );

  TestValidator.notEquals(
    "new access token should differ from original",
    refreshedAuth.token.access,
    initialAccessToken,
  );

  TestValidator.notEquals(
    "new refresh token should differ from original (token rotation)",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );

  // Step 5: Verify expiration timestamps are extended
  const newExpiredAt = new Date(refreshedAuth.token.expired_at);
  const newRefreshableUntil = new Date(refreshedAuth.token.refreshable_until);

  TestValidator.predicate(
    "new expired_at should be later than original",
    newExpiredAt.getTime() > initialExpiredAt.getTime(),
  );

  TestValidator.predicate(
    "new refreshable_until should be later than original",
    newRefreshableUntil.getTime() > initialRefreshableUntil.getTime(),
  );

  TestValidator.predicate(
    "refreshable_until should be later than expired_at",
    newRefreshableUntil.getTime() > newExpiredAt.getTime(),
  );
}
