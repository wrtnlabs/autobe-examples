import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";

/**
 * Validate guest refresh workflow (happy path).
 *
 * This E2E test performs the complete guest refresh sequence:
 *
 * 1. Obtain an initial guest authorization via POST /auth/guest/join
 * 2. Use the returned refresh token to call POST /auth/guest/refresh
 * 3. Assert that refreshed authorization payload is well-formed and that business
 *    expectations hold (access token present, refresh token present, guest id
 *    consistent, and detection of refresh-token rotation when applicable).
 *
 * Business rationale: Guests use short-lived credentials; refresh semantics
 * ensure session continuity. This test validates the server-side refresh
 * behavior without touching low-level header management (the SDK handles
 * Authorization header updates automatically).
 */
export async function test_api_guest_refresh_existing_session(
  connection: api.IConnection,
) {
  // 1) Create a fresh guest identity and obtain initial tokens
  const joined: ITodoAppGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(joined);

  // Basic sanity checks on returned token fields
  TestValidator.predicate(
    "joined: access token present",
    typeof joined.token.access === "string" && joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "joined: refresh token present",
    typeof joined.token.refresh === "string" && joined.token.refresh.length > 0,
  );

  // 2) Prepare refresh request body (use satisfies pattern)
  const refreshBody = {
    refresh_token: joined.token.refresh,
  } satisfies ITodoAppGuest.IRefresh;

  // 3) Call refresh endpoint to renew authorization
  const refreshed: ITodoAppGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 4) Business-level assertions about the refreshed payload
  TestValidator.predicate(
    "refreshed: access token present",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed: refresh token present",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );

  // Guest identity should remain consistent between initial and refreshed payloads
  TestValidator.equals(
    "guest id unchanged after refresh",
    refreshed.id,
    joined.id,
  );

  // If the server rotates refresh tokens, they must differ. Otherwise, it's
  // acceptable for the implementation to reuse the same refresh token.
  if (refreshed.token.refresh !== joined.token.refresh) {
    TestValidator.notEquals(
      "refresh token rotated",
      refreshed.token.refresh,
      joined.token.refresh,
    );
  } else {
    TestValidator.equals(
      "refresh token unchanged (rotation not applied)",
      refreshed.token.refresh,
      joined.token.refresh,
    );
  }

  // Note: Optionally we could call a public-read endpoint to verify the new
  // access token's usability, but no additional public endpoints were provided
  // in the available SDK materials. The token values themselves are validated
  // and typia.assert ensures structural correctness.
}
