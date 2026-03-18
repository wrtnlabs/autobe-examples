import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_reuse_prevented(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection, {
    body: {} satisfies IHrmTimeTrackingGuest.IJoin,
  });
  typia.assert(joined);
  const initialRefreshToken = joined.token.refresh;
  const initialAccessToken = joined.token.access;
  const refreshedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: initialRefreshToken,
    },
  };
  const refreshed = await authorize_guest_refresh(refreshedConnection, {
    body: {} satisfies IHrmTimeTrackingGuest.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.notEquals(
    "refresh rotation should issue a new access token",
    refreshed.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "refresh rotation should issue a new refresh token",
    refreshed.token.refresh,
    initialRefreshToken,
  );
  const replayConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: initialRefreshToken,
    },
  };
  await TestValidator.error(
    "reusing an already consumed guest refresh token should be rejected",
    async () => {
      await authorize_guest_refresh(replayConnection, {
        body: {} satisfies IHrmTimeTrackingGuest.IRefresh,
      });
    },
  );
}
