import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_successful_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register guest and obtain initial JWT tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinAuth: IECommerceMallGuest.IAuthorized = await authorize_guest_join(
    joinConnection,
    {
      body: {
        device_identifier: RandomGenerator.alphaNumeric(32),
      },
    },
  );
  typia.assert(joinAuth);
  const oldAccessToken: string = joinAuth.token.access;
  const oldRefreshToken: string = joinAuth.token.refresh;
  // Step 2: Refresh the session with the old refresh token + new page context
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshAuth: IECommerceMallGuest.IAuthorized =
    await authorize_guest_refresh(refreshConnection, {
      body: {
        refreshToken: oldRefreshToken,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallGuest.IRefresh,
    });
  typia.assert(refreshAuth);
  // Step 3: Verify token rotation — new tokens differ from original ones
  TestValidator.notEquals(
    "access token rotated",
    refreshAuth.token.access,
    oldAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshAuth.token.refresh,
    oldRefreshToken,
  );
  // Step 4: Old refresh token is now consumed — reuse returns 401
  const staleConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("old refresh token rejected", 401, async () => {
    await authorize_guest_refresh(staleConnection, {
      body: {
        refreshToken: oldRefreshToken,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallGuest.IRefresh,
    });
  });
  // Step 5: New access token authorizes subsequent API calls
  const verifyConnection: api.IConnection = { host: connection.host };
  const verifyAuth: IECommerceMallGuest.IAuthorized =
    await authorize_guest_refresh(verifyConnection, {
      body: {
        refreshToken: refreshAuth.token.refresh,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallGuest.IRefresh,
    });
  typia.assert(verifyAuth);
}
