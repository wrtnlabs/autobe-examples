import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_guest_token_refresh(
  connection: api.IConnection,
) {
  // 1. Guest joins to create a new guest user and obtain tokens
  const guestJoinBody = {
    name: RandomGenerator.name(),
    href: `https://${RandomGenerator.alphabets(8)}.example.com/`,
    referrer: `https://${RandomGenerator.alphabets(8)}.referrer.com/`,
  } satisfies IShoppingMallGuest.IJoin;

  const authorizedGuest: IShoppingMallGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestJoinBody,
    });
  typia.assert(authorizedGuest);

  // 2. Extract refresh token from join response
  const initialRefreshToken: string = authorizedGuest.token.refresh;
  typia.assert<string>(initialRefreshToken);

  // 3. Call refresh endpoint with refresh token
  const refreshBody = {
    refresh_token: initialRefreshToken,
  } satisfies IShoppingMallGuest.IRefresh;

  const refreshedGuest: IShoppingMallGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedGuest);

  // 4. Validate token structure
  const { token: initialToken } = authorizedGuest;
  const { token: refreshedToken } = refreshedGuest;

  typia.assert<IAuthorizationToken>(initialToken);
  typia.assert<IAuthorizationToken>(refreshedToken);

  TestValidator.predicate(
    "refreshed access token is valid string",
    typeof refreshedToken.access === "string" &&
      refreshedToken.access.length > 0,
  );

  TestValidator.predicate(
    "refreshed refresh token is valid string",
    typeof refreshedToken.refresh === "string" &&
      refreshedToken.refresh.length > 0,
  );

  // 5. Confirm expiration timestamps are extended
  TestValidator.predicate(
    "refreshed expired_at is later than initial",
    new Date(refreshedToken.expired_at) > new Date(initialToken.expired_at),
  );

  TestValidator.predicate(
    "refreshed refreshable_until is later than initial",
    new Date(refreshedToken.refreshable_until) >
      new Date(initialToken.refreshable_until),
  );

  // 6. Ensure token refresh maintains session continuity
  TestValidator.predicate(
    "guest id unchanged",
    authorizedGuest.id === refreshedGuest.id,
  );
}
