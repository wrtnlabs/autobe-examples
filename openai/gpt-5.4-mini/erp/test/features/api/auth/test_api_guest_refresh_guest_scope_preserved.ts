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

export async function test_api_guest_refresh_guest_scope_preserved(
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
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_guest_refresh(refreshedConnection, {
    body: {
      refreshToken: joined.refresh,
    } satisfies IErpHrmTimeGuestSession.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.notEquals(
    "refresh token should rotate",
    refreshed.refresh,
    joined.refresh,
  );
  TestValidator.notEquals(
    "access token should rotate",
    refreshed.access,
    joined.access,
  );
  TestValidator.notEquals(
    "expiredAt should advance or differ",
    refreshed.expiredAt,
    joined.expiredAt,
  );
  const replayConnection: api.IConnection = { host: connection.host };
  const replayed = await authorize_guest_refresh(replayConnection, {
    body: {
      refreshToken: refreshed.refresh,
    } satisfies IErpHrmTimeGuestSession.IRefresh,
  });
  typia.assert(replayed);
  TestValidator.notEquals(
    "replayed refresh should issue a new access token",
    replayed.access,
    refreshed.access,
  );
  TestValidator.notEquals(
    "replayed refresh should issue a new refresh token",
    replayed.refresh,
    refreshed.refresh,
  );
}
