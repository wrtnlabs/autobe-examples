import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test the successful refresh of temporary JWT tokens for a guest user using a
 * valid refresh token.
 *
 * This test covers the following steps:
 *
 * 1. Create a new guest user context by calling the guest join operation (POST
 *    /auth/guest/join) with valid required data.
 * 2. Assert the returned authorized guest user data including id and tokens.
 * 3. Use the refresh token from the guest join response to call the guest token
 *    refresh operation (PATCH /auth/guest/refresh).
 * 4. Assert that new authorization tokens are issued.
 * 5. Validate that the access token and refresh token strings are different from
 *    the previously issued ones.
 * 6. Confirm that the guest user retains limited authorization scopes appropriate
 *    for anonymous access.
 */
export async function test_api_guest_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Call guest join to obtain initial authorized guest credentials
  const guestCreateBody = {
    ip: "127.0.0.1",
    created_at: new Date().toISOString(),
  } satisfies IShoppingMallGuest.ICreate;

  const authorizedGuest: IShoppingMallGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestCreateBody,
    });
  typia.assert(authorizedGuest);

  // Validate initial tokens are non-empty strings
  TestValidator.predicate(
    "initial access token is a non-empty string",
    typeof authorizedGuest.token.access === "string" &&
      authorizedGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token is a non-empty string",
    typeof authorizedGuest.token.refresh === "string" &&
      authorizedGuest.token.refresh.length > 0,
  );

  // 2. Prepare refresh body with valid refresh token
  const refreshBody = {
    refresh_token: authorizedGuest.token.refresh,
  } satisfies IShoppingMallGuest.IRefresh;

  // 3. Use refresh token to request new authorization tokens
  const refreshedGuest: IShoppingMallGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedGuest);

  // Extract tokens for readability
  const initialAccess = authorizedGuest.token.access;
  const initialRefresh = authorizedGuest.token.refresh;
  const newAccess = refreshedGuest.token.access;
  const newRefresh = refreshedGuest.token.refresh;

  // 4. Validate that new tokens differ from initial tokens
  TestValidator.notEquals(
    "access token changes upon refresh",
    newAccess,
    initialAccess,
  );
  TestValidator.notEquals(
    "refresh token changes upon refresh",
    newRefresh,
    initialRefresh,
  );

  // 5. Validate new token expiration timestamps are valid ISO datetime strings
  TestValidator.predicate(
    "new access token expiration is valid ISO datetime",
    !Number.isNaN(Date.parse(refreshedGuest.token.expired_at)),
  );
  TestValidator.predicate(
    "new refresh token expiration is valid ISO datetime",
    !Number.isNaN(Date.parse(refreshedGuest.token.refreshable_until)),
  );

  // 6. Validate the guest user ID remains the same
  TestValidator.equals(
    "guest user ID remains unchanged",
    refreshedGuest.id,
    authorizedGuest.id,
  );
}
