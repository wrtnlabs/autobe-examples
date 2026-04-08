import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_replayed_token_rejected(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection, {
    body: {
      href: "https://example.com/guest/join",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeGuestSession.IJoin,
  });
  typia.assert(joined);
  const originalRefreshToken: string = joined.refresh;
  const refreshed = await authorize_guest_refresh(guestConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IErpHrmTimeGuestSession.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.notEquals(
    "refresh token should rotate after a successful exchange",
    refreshed.refresh,
    originalRefreshToken,
  );
  await TestValidator.httpError(
    "replayed refresh token must be rejected",
    [400, 401, 403],
    async () => {
      await authorize_guest_refresh(guestConnection, {
        body: {
          refreshToken: originalRefreshToken,
        } satisfies IErpHrmTimeGuestSession.IRefresh,
      });
    },
  );
}
