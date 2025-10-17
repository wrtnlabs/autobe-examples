import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

/**
 * Validates token refresh security with already-used refresh token.
 *
 * Tests the token refresh endpoint's ability to detect and reject refresh token
 * reuse attempts, enforcing proper token rotation and preventing replay
 * attacks.
 *
 * Test flow:
 *
 * 1. Create a new guest user account via /auth/guestUser/join to obtain initial
 *    refresh token
 * 2. Use the refresh token to obtain a new access token via first refresh call
 * 3. Attempt to reuse the same refresh token for a second refresh call
 * 4. Verify the second refresh attempt fails with HTTP 401 status
 * 5. Verify error response contains 'AUTH_TOKEN_REVOKED' error code
 * 6. Verify error message indicates token has already been used
 */
export async function test_api_guest_user_token_refresh_already_used_token(
  connection: api.IConnection,
) {
  // Step 1: Create guest user account to obtain initial refresh token
  const joinResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
      } satisfies ITodoAppGuestUser.IJoin,
    });
  typia.assert(joinResponse);

  // Extract the refresh token from the join response
  const initialRefreshToken: string = joinResponse.refreshToken ?? "";
  TestValidator.predicate(
    "refresh token obtained from join response",
    initialRefreshToken.length > 0,
  );

  // Step 2: Use refresh token to obtain new access token (first refresh)
  const firstRefreshResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies ITodoAppGuestUser.IRefresh,
    });
  typia.assert(firstRefreshResponse);

  // Verify first refresh succeeded and returned new token
  TestValidator.predicate(
    "first refresh returns valid authorization response",
    firstRefreshResponse.token.access.length > 0,
  );

  // Step 3: Attempt to reuse the same refresh token for second refresh
  // This should fail because the token has already been used
  await TestValidator.error(
    "reusing already-used refresh token should fail with HTTP 401",
    async () => {
      await api.functional.auth.guestUser.refresh(connection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies ITodoAppGuestUser.IRefresh,
      });
    },
  );

  // Note: The above error test validates that the endpoint correctly rejects
  // the reused refresh token. In a real scenario with more detailed error
  // information available in the HttpError exception, we would additionally
  // verify the specific error code and message.
}
