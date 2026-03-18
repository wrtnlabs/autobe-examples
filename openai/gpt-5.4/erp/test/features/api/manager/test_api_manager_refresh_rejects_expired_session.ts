import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";

export async function test_api_manager_refresh_rejects_expired_session(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const joined: IHrmTimeTrackingManager.IAuthorized =
    await authorize_manager_join(managerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16) satisfies string as string,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmTimeTrackingManager.IJoin,
    });
  typia.assert(joined);
  const token: IAuthorizationToken = joined.token;
  TestValidator.predicate(
    "issued refresh token is non-empty",
    token.refresh.length > 0,
  );
  const refreshableUntilMs: number = new Date(
    token.refreshable_until,
  ).getTime();
  const nowMs: number = Date.now();
  TestValidator.predicate(
    "refreshable_until is in the future at issuance",
    Number.isFinite(refreshableUntilMs) && refreshableUntilMs > nowMs,
  );
  const remainingLifetimeMs: number = refreshableUntilMs - nowMs;
  TestValidator.predicate(
    "refresh lifetime is short enough for deterministic e2e expiry test",
    remainingLifetimeMs <= 60000,
  );
  const waitMs: number = Math.max(remainingLifetimeMs + 1000, 0);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  const expiredRefreshBody = {
    refresh: token.refresh,
  } satisfies IHrmTimeTrackingManager.IRefresh;
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "expired manager refresh token is rejected after session lifetime elapses",
    [401, 403],
    async () => {
      await authorize_manager_refresh(refreshConnection, {
        body: expiredRefreshBody,
      });
    },
  );
}
