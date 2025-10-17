import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Validate refreshing a guest session using a valid and invalid
 * anonymous_token.
 *
 * This test covers both the main user flow for guest session refresh as well as
 * critical error scenarios.
 *
 * 1. Register as a guest user and obtain a valid anonymous_token
 * 2. Call refresh endpoint using the valid anonymous_token
 *
 *    - Expect a valid IAuthorized session returned
 *    - Validate output type and that the session id matches the original
 *    - (Note: Anonymous token may be rotated; session id should be consistent)
 * 3. Attempt to refresh with an invalid anonymous_token
 *
 *    - Should raise a business error
 */
export async function test_api_guest_session_refresh_token_validity(
  connection: api.IConnection,
) {
  // 1. Register guest session
  const guest = await api.functional.auth.guest.join(connection);
  typia.assert(guest);

  // 2. Successful refresh with valid anonymous_token
  const refreshBody = {
    anonymous_token: guest.anonymous_token,
  } satisfies IDiscussionBoardGuest.IRefresh;
  const refreshed = await api.functional.auth.guest.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "refreshed guest session id matches original",
    refreshed.id,
    guest.id,
  );
  TestValidator.notEquals(
    "token after refresh is not null",
    refreshed.token.access,
    null,
  );

  // 3. Error: refresh with an obviously invalid token
  await TestValidator.error(
    "refreshing with an invalid anonymous_token fails",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          anonymous_token: RandomGenerator.alphaNumeric(32),
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );
}
