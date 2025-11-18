import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

/**
 * Verify guestUser refresh behavior with invalid or reused refresh tokens.
 *
 * Business goals:
 *
 * - Ensure /auth/guestUser/refresh succeeds for valid refresh tokens.
 * - Ensure /auth/guestUser/refresh fails for malformed, random, or reused refresh
 *   tokens.
 *
 * Steps:
 *
 * 1. Call /auth/guestUser/join to obtain an ITodoAppGuestUser.IAuthorized payload
 *    with a valid refresh token.
 * 2. Perform a baseline successful refresh using the issued refresh token and
 *    validate the returned ITodoAppGuestUser.IAuthorized response.
 * 3. Attempt to refresh with a clearly malformed token string ("not-a-jwt") and
 *    assert that the call fails.
 * 4. Attempt to refresh with a random long string token and assert that the call
 *    fails.
 * 5. Attempt to reuse the original refresh token again after it has already been
 *    used and assert that the call fails (replay attack scenario).
 */
export async function test_api_guest_user_refresh_with_invalid_or_reused_refresh_token(
  connection: api.IConnection,
) {
  // 1. Join as a guest user to obtain initial authorized context
  const joinBody = {
    external_ref: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppGuestUser.IJoinRequest;

  const joined: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(joined);
  typia.assert<IAuthorizationToken>(joined.token);

  const originalRefreshToken: string | undefined = joined.refreshToken;

  // 2. Baseline successful refresh using the real refresh token
  if (originalRefreshToken !== undefined) {
    const refreshRequest = {
      refreshToken: originalRefreshToken,
    } satisfies ITodoAppGuestUser.IRefreshRequest;

    const refreshed: ITodoAppGuestUser.IAuthorized =
      await api.functional.auth.guestUser.refresh(connection, {
        body: refreshRequest,
      });
    typia.assert<ITodoAppGuestUser.IAuthorized>(refreshed);
    typia.assert<IAuthorizationToken>(refreshed.token);
  }

  // 3. Variant A: malformed refresh token string
  const malformedRefreshBody = {
    refreshToken: "not-a-jwt",
  } satisfies ITodoAppGuestUser.IRefreshRequest;

  await TestValidator.error(
    "guestUser refresh with malformed token must fail",
    async () => {
      await api.functional.auth.guestUser.refresh(connection, {
        body: malformedRefreshBody,
      });
    },
  );

  // 4. Variant B: random, non-issued refresh token
  const randomToken: string = RandomGenerator.alphaNumeric(128);
  const randomRefreshBody = {
    refreshToken: randomToken,
  } satisfies ITodoAppGuestUser.IRefreshRequest;

  await TestValidator.error(
    "guestUser refresh with random non-issued token must fail",
    async () => {
      await api.functional.auth.guestUser.refresh(connection, {
        body: randomRefreshBody,
      });
    },
  );

  // 5. Variant C: replay original refresh token after successful use
  if (originalRefreshToken !== undefined) {
    const replayBody = {
      refreshToken: originalRefreshToken,
    } satisfies ITodoAppGuestUser.IRefreshRequest;

    await TestValidator.error(
      "guestUser refresh with reused (replayed) refresh token must fail",
      async () => {
        await api.functional.auth.guestUser.refresh(connection, {
          body: replayBody,
        });
      },
    );
  }
}
