import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_token_refresh_success_and_replay_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1) Guest join -> obtain refresh token R1
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = typia.random<string & tags.Format<"password">>();
  const joinBody = {
    email: joinEmail,
    password: joinPassword,
  } satisfies IErpHrmTimeTrackingGuest.IJoin;
  const joined: IErpHrmTimeTrackingGuest.IAuthorized =
    await authorize_guest_join(guestJoinConnection, {
      body: joinBody,
    });
  typia.assert(joined);
  const guestId = joined.id;
  const refreshTokenR1 = joined.token.refresh;
  // 2) Refresh using R1
  const guestRefreshConnection1: api.IConnection = { host: connection.host };
  const refreshBody1 = {
    refreshToken: refreshTokenR1,
  } satisfies IErpHrmTimeTrackingGuest.IRefresh;
  const refreshed1: IErpHrmTimeTrackingGuest.IAuthorized =
    await authorize_guest_refresh(guestRefreshConnection1, {
      body: refreshBody1,
    });
  typia.assert(refreshed1);
  // Validate identity continuity
  TestValidator.equals("guest id matches join", refreshed1.id, guestId);
  // Validate returned token structure includes access+refresh
  TestValidator.predicate(
    "has access token",
    refreshed1.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    refreshed1.token.refresh.length > 0,
  );
  // 3) Replay attempt with the original refresh token R1
  const guestRefreshConnection2: api.IConnection = { host: connection.host };
  const refreshBodyReplay = {
    refreshToken: refreshTokenR1,
  } satisfies IErpHrmTimeTrackingGuest.IRefresh;
  await TestValidator.error(
    "replay refresh with revoked/old token must fail",
    async () => {
      const replayed: IErpHrmTimeTrackingGuest.IAuthorized =
        await authorize_guest_refresh(guestRefreshConnection2, {
          body: refreshBodyReplay,
        });
      typia.assert(replayed);
      // If refresh succeeded, force failure regardless of token values.
      throw new Error(
        "expected replayed refresh token (R1) to be rejected, but it succeeded",
      );
    },
  );
}
