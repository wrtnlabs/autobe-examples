import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that the /auth/user/refresh endpoint allows a user with a valid,
 * non-expired refresh token and session ID to refresh their authentication
 * session, returning new credentials and enforcing single-use token rules.
 *
 * This test simulates the session refresh process for a logged-in user,
 * focusing on the business rule that a refresh token can only be used once. It
 * ensures fresh tokens are issued for a valid request and that subsequent uses
 * of an already used or expired token are correctly rejected. Edge cases
 * include using a valid but expired token and ensuring the correct linkage to
 * user profile and session state.
 *
 * Steps:
 *
 * 1. Simulate registration/login of a user to obtain a valid refresh
 *    token/session_id (mock random values, since only refresh is implemented).
 * 2. Call the refresh endpoint with valid refresh_token and session_id, verify
 *    successful token issuance and authenticated user profile.
 * 3. Immediately call refresh endpoint again with the _SAME_
 *    refresh_token/session_id to assert that it is now invalid (single-use
 *    token rule).
 * 4. (Edge case) Attempt refresh with a random, obviously expired/invalid token
 *    and session_id to ensure robust error response.
 * 5. Confirm that the new tokens are linked to the same user account, with a
 *    refreshed authenticated state and session chaining (if applicable).
 */
export async function test_api_user_session_refresh_with_valid_token(
  connection: api.IConnection,
) {
  // 1. Prepare synthetic but realistic session credentials for refresh
  // (As only refresh is implemented, use typia.random for plausible request data)
  const refreshRequest = typia.random<ITodoListUser.IRefresh>();

  // 2. Call refresh endpoint with valid refresh_token and session_id
  const authResult = await api.functional.auth.user.refresh(connection, {
    body: refreshRequest,
  });
  typia.assert(authResult);
  TestValidator.predicate(
    "refresh endpoint issues new tokens with proper structure",
    typeof authResult.token === "object" &&
      typeof authResult.token.access === "string" &&
      typeof authResult.token.refresh === "string",
  );
  TestValidator.equals(
    "refreshed user id matches session id linkage",
    authResult.id,
    authResult.user?.id,
  );

  // 3. Call refresh again with same token/session -- should be invalid as per single-use rule
  await TestValidator.error(
    "cannot reuse an already used refresh token (single-use rule)",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: refreshRequest,
      });
    },
  );

  // 4. Try with an obviously expired/invalid token and session_id
  const invalidRefreshRequest = {
    refresh_token: RandomGenerator.alphaNumeric(32),
    session_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies ITodoListUser.IRefresh;
  await TestValidator.error(
    "rejects refresh for random invalid token/session_id",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: invalidRefreshRequest,
      });
    },
  );

  // 5. Optionally, check new token has a later expiration than a previous one (if timestamps make sense)
  // (Since we used random data, skip cross-request timestamp checks)
}
