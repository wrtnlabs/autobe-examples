import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserRefresh";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

export async function test_api_guestuser_refresh_rejected_for_malformed_token(
  connection: api.IConnection,
) {
  // 1. Establish a real guestUser session via join to obtain a valid refresh token
  const joinRequestBody = {
    external_reference: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://example.com/landing",
    referrer: "https://example.com/referrer",
  } satisfies ITodoAppGuestUserJoin.IRequest;

  const joined: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(joined);

  const validRefreshToken: string = joined.token.refresh;

  // 2. Build a malformed refresh request payload with clearly invalid token
  const malformedRefreshBody = {
    refresh_token: RandomGenerator.alphaNumeric(24), // clearly not a JWT format
    ip: "127.0.0.1",
    href: "https://example.com/landing",
    referrer: "https://example.com/referrer",
  } satisfies ITodoAppGuestUserRefresh.IRequest;

  // 3. Call refresh with malformed token and expect an HTTP error (4xx)
  await TestValidator.httpError(
    "guestUser refresh should fail for malformed refresh token",
    [400, 401, 403, 422],
    async () => {
      await api.functional.auth.guestUser.refresh(connection, {
        body: malformedRefreshBody,
      });
    },
  );

  // 4. Build a valid refresh request payload using the token from join
  const validRefreshBody = {
    refresh_token: validRefreshToken,
    ip: "127.0.0.1",
    href: "https://example.com/landing",
    referrer: "https://example.com/referrer",
  } satisfies ITodoAppGuestUserRefresh.IRequest;

  const refreshed: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: validRefreshBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(refreshed);

  // 5. Basic business checks on continuity of guest/session identity
  TestValidator.equals(
    "refreshed guest identity should match original join guest",
    refreshed.guest.id,
    joined.guest.id,
  );

  TestValidator.equals(
    "refreshed session should reference same guest user",
    refreshed.session.guestUser.id,
    joined.guest.id,
  );

  TestValidator.notEquals(
    "access token should rotate on refresh",
    refreshed.token.access,
    joined.token.access,
  );
}
