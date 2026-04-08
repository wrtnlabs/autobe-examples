import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_session_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial valid guest session
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(joinConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  const validRefreshToken = joinResult.token.refresh;
  // 2. Generate a fake/expired refresh token (invalid UUID not in session table)
  const fakeExpiredToken = typia.random<string & tags.Format<"uuid">>();
  // 3. First verify the valid token works
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const validRefreshResult = await authorize_guest_refresh(
    validRefreshConnection,
    {
      body: {
        refresh_token: validRefreshToken,
      },
    },
  );
  typia.assert(validRefreshResult);
  // 4. Verify valid refresh returns new tokens with future expiration
  TestValidator.predicate(
    "valid refresh returns new expiration",
    () => new Date(validRefreshResult.token.expired_at) > new Date(),
  );
  // 5. Attempt to refresh with the fake/expired token
  const fakeRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "fake expired refresh token",
    [401, 403],
    async () => {
      await authorize_guest_refresh(fakeRefreshConnection, {
        body: {
          refresh_token: fakeExpiredToken,
        },
      });
    },
  );
  // 6. Verify no tokens were issued for the fake refresh attempt
  TestValidator.equals(
    "no auth header on failed refresh",
    fakeRefreshConnection.headers?.Authorization,
    undefined,
  );
  // 7. Verify the original valid session is still intact
  // Re-fetch with original valid refresh token
  const finalRefreshConnection: api.IConnection = { host: connection.host };
  const finalRefreshResult = await authorize_guest_refresh(
    finalRefreshConnection,
    {
      body: {
        refresh_token: validRefreshToken,
      },
    },
  );
  typia.assert(finalRefreshResult);
  TestValidator.equals(
    "original session still valid after failed fake refresh",
    finalRefreshResult.id,
    joinResult.id,
  );
}
