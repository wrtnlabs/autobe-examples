import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test token refresh behavior with respect to token expiration timelines.
 *
 * This test validates the proper implementation of JWT token expiration and
 * refresh mechanisms for guest accounts. It ensures that:
 *
 * 1. Initial tokens are issued with proper expiration timestamps
 * 2. Refresh tokens can be used to obtain new access tokens
 * 3. New tokens have extended expiration timestamps
 * 4. The security pattern of short-lived access tokens with longer-lived refresh
 *    tokens is properly implemented
 *
 * Steps:
 *
 * 1. Register a guest account and capture initial token timestamps
 * 2. Validate initial token expiration structure
 * 3. Use refresh token to obtain new tokens
 * 4. Verify that new tokens have updated (later) expiration timestamps
 * 5. Confirm that the new expired_at is later than the original
 * 6. Confirm that the new refreshable_until is later than the original
 */
export async function test_api_guest_token_refresh_expiration_handling(
  connection: api.IConnection,
) {
  // Step 1: Register a guest account to obtain initial tokens
  const initialGuest = await api.functional.auth.guest.join(connection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string>(),
    } satisfies ITodoListGuest.ICreate,
  });
  typia.assert(initialGuest);

  // Step 2: Capture initial token expiration timestamps
  const initialToken = initialGuest.token;
  typia.assert(initialToken);

  const initialExpiredAt = new Date(initialToken.expired_at);
  const initialRefreshableUntil = new Date(initialToken.refreshable_until);

  // Validate that initial timestamps are valid dates
  TestValidator.predicate(
    "initial expired_at is a valid date",
    !isNaN(initialExpiredAt.getTime()),
  );
  TestValidator.predicate(
    "initial refreshable_until is a valid date",
    !isNaN(initialRefreshableUntil.getTime()),
  );

  // Validate that refreshable_until is later than expired_at (refresh token lives longer)
  TestValidator.predicate(
    "initial refreshable_until should be later than expired_at",
    initialRefreshableUntil.getTime() > initialExpiredAt.getTime(),
  );

  // Step 3: Use refresh token to obtain new tokens
  const refreshedGuest = await api.functional.auth.guest.refresh(connection, {
    body: {
      refresh_token: initialToken.refresh,
    } satisfies ITodoListGuest.IRefresh,
  });
  typia.assert(refreshedGuest);

  // Step 4: Capture new token expiration timestamps
  const refreshedToken = refreshedGuest.token;
  typia.assert(refreshedToken);

  const refreshedExpiredAt = new Date(refreshedToken.expired_at);
  const refreshedRefreshableUntil = new Date(refreshedToken.refreshable_until);

  // Validate that refreshed timestamps are valid dates
  TestValidator.predicate(
    "refreshed expired_at is a valid date",
    !isNaN(refreshedExpiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshed refreshable_until is a valid date",
    !isNaN(refreshedRefreshableUntil.getTime()),
  );

  // Step 5: Verify that new expired_at is later than the original
  TestValidator.predicate(
    "refreshed expired_at should be later than or equal to initial expired_at",
    refreshedExpiredAt.getTime() >= initialExpiredAt.getTime(),
  );

  // Step 6: Verify that new refreshable_until is later than the original
  TestValidator.predicate(
    "refreshed refreshable_until should be later than or equal to initial refreshable_until",
    refreshedRefreshableUntil.getTime() >= initialRefreshableUntil.getTime(),
  );

  // Step 7: Confirm the security pattern - refreshable_until is later than expired_at
  TestValidator.predicate(
    "refreshed refreshable_until should be later than refreshed expired_at",
    refreshedRefreshableUntil.getTime() > refreshedExpiredAt.getTime(),
  );

  // Validate that both access and refresh tokens are present in refreshed response
  TestValidator.predicate(
    "refreshed token has access token",
    typeof refreshedToken.access === "string" &&
      refreshedToken.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed token has refresh token",
    typeof refreshedToken.refresh === "string" &&
      refreshedToken.refresh.length > 0,
  );
}
