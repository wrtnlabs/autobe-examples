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

export async function test_api_guest_token_refresh_until_session_deadline(
  connection: api.IConnection,
): Promise<void> {
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestPassword = typia.random<string & tags.Format<"password">>();
  const joinResult = await authorize_guest_join(guestJoinConnection, {
    body: {
      email: guestEmail,
      password: guestPassword,
    } satisfies IErpHrmTimeTrackingGuest.IJoin,
  });
  typia.assert(joinResult);
  const refreshConnection1: api.IConnection = { host: connection.host };
  const refresh1 = await authorize_guest_refresh(refreshConnection1, {
    body: {
      refreshToken: joinResult.token.refresh,
    } satisfies IErpHrmTimeTrackingGuest.IRefresh,
  });
  typia.assert(refresh1);
  TestValidator.equals(
    "guest id matches after first refresh",
    refresh1.id,
    joinResult.id,
  );
  TestValidator.predicate(
    "second refresh expired_at is newer",
    new Date(refresh1.token.expired_at).getTime() >
      new Date(joinResult.token.expired_at).getTime(),
  );
  // Refresh again before refreshable_until using the most recent refresh token.
  const refreshConnection2: api.IConnection = { host: connection.host };
  const refresh2 = await authorize_guest_refresh(refreshConnection2, {
    body: {
      refreshToken: refresh1.token.refresh,
    } satisfies IErpHrmTimeTrackingGuest.IRefresh,
  });
  typia.assert(refresh2);
  TestValidator.equals(
    "guest id remains same after second refresh",
    refresh2.id,
    joinResult.id,
  );
  TestValidator.predicate(
    "second refreshable attempt keeps session active",
    new Date(refresh2.token.expired_at).getTime() >=
      new Date(refresh1.token.expired_at).getTime(),
  );
  // Wait until after refreshable_until of the latest token.
  const refreshableUntilMs = new Date(
    refresh2.token.refreshable_until,
  ).getTime();
  const nowMs = Date.now();
  const waitMs = Math.max(0, refreshableUntilMs - nowMs + 50);
  if (waitMs > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
  }
  await TestValidator.httpError(
    "guest refresh fails after refreshable_until",
    401,
    async () => {
      const refreshConnection3: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(refreshConnection3, {
        body: {
          refreshToken: refresh2.token.refresh,
        } satisfies IErpHrmTimeTrackingGuest.IRefresh,
      });
    },
  );
}
