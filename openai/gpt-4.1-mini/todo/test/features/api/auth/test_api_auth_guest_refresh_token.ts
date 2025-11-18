import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * This test validates the functionality of the guest token refresh endpoint.
 *
 * It performs the following steps:
 *
 * 1. Creates a temporary guest session via the `/auth/guest/join` API to obtain
 *    initial access and refresh tokens.
 * 2. Uses the received refresh token to call `/auth/guest/refresh` API to get new
 *    access and refresh tokens, refreshing the guest session.
 * 3. Validates that the refreshed tokens differ from the original tokens, ensuring
 *    a proper refresh occurred.
 * 4. Checks that the expiration fields on the refreshed token are valid ISO 8601
 *    date strings, confirming timestamp correctness.
 *
 * This ensures temporary guest sessions can maintain continuity without
 * reauthentication.
 */
export async function test_api_auth_guest_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Guest join to create temporary guest account and get tokens
  const joinBody = {
    href: "https://example.com/landing-page",
    referrer: "https://example.com/",
  } satisfies ITodoListGuest.IJoin;
  const joinResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: joinBody });
  typia.assert(joinResponse);

  // Step 2: Use refresh token from join to refresh access tokens
  const refreshBody = {
    refresh_token: joinResponse.token.refresh,
  } satisfies ITodoListGuest.IRefresh;
  const refreshResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, { body: refreshBody });
  typia.assert(refreshResponse);

  // Step 3: Assert that refresh token and access token have changed
  TestValidator.notEquals(
    "Refresh token should be different after refresh",
    refreshResponse.token.refresh,
    joinResponse.token.refresh,
  );
  TestValidator.notEquals(
    "Access token should be different after refresh",
    refreshResponse.token.access,
    joinResponse.token.access,
  );

  // Step 4: Validate expiry timestamps are valid ISO 8601 strings
  TestValidator.predicate(
    "Access token expiry is a valid ISO 8601 string",
    !isNaN(Date.parse(refreshResponse.token.expired_at)),
  );
  TestValidator.predicate(
    "Refresh token expiry is a valid ISO 8601 string",
    !isNaN(Date.parse(refreshResponse.token.refreshable_until)),
  );
}
