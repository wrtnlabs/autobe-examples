import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

export async function test_api_guest_user_refresh_rejects_tampered_token(
  connection: api.IConnection,
) {
  // 1. Join as a guest user to obtain a valid authorized payload with tokens.
  const joinBody = typia.random<ICommunityPlatformGuestuser.IJoin>();

  const authorized: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const originalRefreshToken: string = authorized.token.refresh;

  // Helper to safely create a truncated token if possible
  const truncatedToken: string =
    originalRefreshToken.length > 1
      ? originalRefreshToken.slice(0, -1)
      : originalRefreshToken + "x";

  // Helper to flip a character roughly in the middle of the token
  const middleIndex: number = Math.floor(originalRefreshToken.length / 2);
  const flippedToken: string =
    originalRefreshToken.length === 0
      ? RandomGenerator.alphaNumeric(10)
      : originalRefreshToken.slice(0, middleIndex) +
        (originalRefreshToken[middleIndex] === "a" ? "b" : "a") +
        originalRefreshToken.slice(middleIndex + 1);

  // Completely random token with a similar length
  const randomTokenLength: number = Math.max(originalRefreshToken.length, 10);
  const randomToken: string = RandomGenerator.alphaNumeric(randomTokenLength);

  const tamperedTokens: string[] = [truncatedToken, flippedToken, randomToken];

  // 2. For each tampered token, ensure refresh fails.
  for (const token of tamperedTokens) {
    await TestValidator.error(
      "tampered refresh token must be rejected",
      async () => {
        await api.functional.auth.guestUser.refresh(connection, {
          body: {
            refreshToken: token,
          } satisfies ICommunityPlatformGuestuser.IRefresh,
        });
      },
    );
  }

  // 3. Optionally verify that the original token still works.
  const refreshed: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: {
        refreshToken: originalRefreshToken,
      } satisfies ICommunityPlatformGuestuser.IRefresh,
    });
  typia.assert(refreshed);
}
