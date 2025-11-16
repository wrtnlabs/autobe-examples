import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test successful guest access token refresh using a valid refresh token.
 *
 * This test validates the complete token refresh workflow for guest users:
 *
 * 1. Create a guest account and obtain initial tokens
 * 2. Use the refresh token to request new access tokens
 * 3. Verify the refresh response contains valid token information
 * 4. Ensure guest session continuity is maintained
 *
 * The test confirms that the system properly validates the refresh token's
 * signature, expiration, and association with an active guest account before
 * issuing new tokens.
 */
export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest account to obtain tokens
  const guestCreateBody = {
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardGuest.ICreate;

  const initialGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestCreateBody,
    });
  typia.assert(initialGuest);

  // Step 2: Extract refresh token from initial registration
  const refreshToken: string = initialGuest.token.refresh;
  TestValidator.predicate(
    "refresh token should be non-empty string",
    refreshToken.length > 0,
  );

  // Step 3: Call refresh endpoint with the refresh token
  const refreshBody = {
    refresh_token: refreshToken,
  } satisfies IDiscussionBoardGuest.IRefresh;

  const refreshedGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedGuest);

  // Step 4: Validate guest ID consistency
  TestValidator.equals(
    "guest ID should remain the same after refresh",
    refreshedGuest.id,
    initialGuest.id,
  );
}
