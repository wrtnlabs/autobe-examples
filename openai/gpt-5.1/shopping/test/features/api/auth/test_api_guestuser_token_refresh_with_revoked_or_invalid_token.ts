import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

export async function test_api_guestuser_token_refresh_with_revoked_or_invalid_token(
  connection: api.IConnection,
) {
  // 1. Create a valid guest user and obtain its refresh token
  const joinBody = {
    external_reference: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallGuestUser.IJoin;

  const authorized = await api.functional.auth.guestUser.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(authorized);

  const validRefreshToken: string = authorized.token.refresh;

  // 2. Perform a positive control: valid refresh token should succeed
  const refreshed = await api.functional.auth.guestUser.refresh(connection, {
    body: {
      refresh_token: validRefreshToken,
    } satisfies IShoppingMallGuestUser.IRefresh,
  });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(refreshed);

  // 3. Build invalid / unusable refresh_token candidates
  const randomToken: string = RandomGenerator.alphaNumeric(64);

  // Mutate the valid token slightly to keep similar structure but break signature
  const mutatedToken: string =
    validRefreshToken.length === 0
      ? randomToken
      : (() => {
          const index = Math.floor(validRefreshToken.length / 2);
          const chars = validRefreshToken.split("");
          const mutationSource =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
          const replacement = RandomGenerator.pick([...mutationSource]);
          chars[index] = replacement === chars[index] ? "x" : replacement;
          return chars.join("");
        })();

  const emptyToken = "";

  const invalidTokens: string[] = [randomToken, mutatedToken, emptyToken];

  // 4. For each invalid token, assert that refresh() fails and does not
  //    yield an authorized payload
  for (const token of invalidTokens) {
    await TestValidator.error(
      `guest refresh must reject invalid token: ${token === emptyToken ? "empty" : token === randomToken ? "random" : "mutated"}`,
      async () => {
        await api.functional.auth.guestUser.refresh(connection, {
          body: {
            refresh_token: token,
          } satisfies IShoppingMallGuestUser.IRefresh,
        });
      },
    );
  }
}
