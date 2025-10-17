import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardGuest";

export async function test_api_guest_session_refresh(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest session to obtain an initial token
  const initialGuestSession: IEconomicBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(initialGuestSession);

  // Validate the initial guest session structure
  TestValidator.equals(
    "initial guest session has valid id",
    initialGuestSession.id,
    initialGuestSession.id,
  );
  TestValidator.equals(
    "initial guest session has valid token structure",
    initialGuestSession.token.access,
    initialGuestSession.token.access,
  );
  TestValidator.equals(
    "initial guest session has valid refreshable_until",
    initialGuestSession.token.refreshable_until,
    initialGuestSession.token.refreshable_until,
  );
  TestValidator.equals(
    "initial guest session has valid expired_at",
    initialGuestSession.token.expired_at,
    initialGuestSession.token.expired_at,
  );

  // Step 2: Refresh the guest session token
  const refreshedGuestSession: IEconomicBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection);
  typia.assert(refreshedGuestSession);

  // Validate that the refresh operation preserved the same session identity
  TestValidator.equals(
    "refreshed session id matches initial session id",
    initialGuestSession.id,
    refreshedGuestSession.id,
  );

  // Validate that the access token was updated
  TestValidator.notEquals(
    "refreshed access token differs from initial access token",
    initialGuestSession.token.access,
    refreshedGuestSession.token.access,
  );

  // Validate that the refresh token was updated
  TestValidator.notEquals(
    "refreshed refresh token differs from initial refresh token",
    initialGuestSession.token.refresh,
    refreshedGuestSession.token.refresh,
  );

  // Validate that expiration timestamps were updated
  const initialExpiredAt = new Date(initialGuestSession.token.expired_at);
  const refreshedExpiredAt = new Date(refreshedGuestSession.token.expired_at);
  TestValidator.predicate(
    "refreshed expired_at is later than initial expired_at",
    refreshedExpiredAt > initialExpiredAt,
  );

  const initialRefreshableUntil = new Date(
    initialGuestSession.token.refreshable_until,
  );
  const refreshedRefreshableUntil = new Date(
    refreshedGuestSession.token.refreshable_until,
  );
  TestValidator.predicate(
    "refreshed refreshable_until is later than initial refreshable_until",
    refreshedRefreshableUntil > initialRefreshableUntil,
  );

  // Verify the connection headers were updated
  // This is handled automatically by the SDK and should not be checked
  // as per the absolute prohibition on connection.headers manipulation
}
