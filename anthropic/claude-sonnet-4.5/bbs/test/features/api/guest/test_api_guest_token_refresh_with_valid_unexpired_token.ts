import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test token refresh operation with a valid, unexpired refresh token.
 *
 * This test validates that the system accepts refresh tokens that are still
 * within their validity period and issues new access tokens accordingly.
 *
 * The test follows these steps:
 *
 * 1. Create a guest account through the join endpoint to obtain initial tokens
 * 2. Immediately use the refresh token (before expiration) to request new
 *    credentials
 * 3. Verify that the refresh operation succeeds
 * 4. Validate that new tokens are properly structured and the guest ID is
 *    consistent
 *
 * This confirms that early token refresh is supported for proactive token
 * rotation strategies, allowing guests to maintain session continuity even when
 * the refresh token is far from expiration.
 */
export async function test_api_guest_token_refresh_with_valid_unexpired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a guest account to obtain valid refresh token
  const guestRegistration = {
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardGuest.ICreate;

  const initialGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestRegistration,
    });

  typia.assert(initialGuest);

  // Step 2: Immediately use the refresh token to obtain new credentials
  const refreshRequest = {
    refresh_token: initialGuest.token.refresh,
  } satisfies IDiscussionBoardGuest.IRefresh;

  const refreshedGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshRequest,
    });

  typia.assert(refreshedGuest);

  // Step 3: Validate the refresh operation results
  TestValidator.equals(
    "guest ID should remain consistent after refresh",
    refreshedGuest.id,
    initialGuest.id,
  );
}
