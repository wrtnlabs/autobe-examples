import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_expired_refresh_token_rejected(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(joined);
  // Wait until the joined access/session is expired based on token timestamps.
  const expiredAtMs = new Date(joined.token.expired_at).getTime();
  const refreshableUntilMs = new Date(joined.token.refreshable_until).getTime();
  const waitUntilMs = Math.max(expiredAtMs, refreshableUntilMs);
  while (Date.now() <= waitUntilMs) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "guest refresh must be rejected after refresh expiration",
    [401, 403],
    async () => {
      await authorize_guest_refresh(refreshConnection, {
        body: {} satisfies IShoppingMallGuest.IRefresh,
      });
    },
  );
  // Repeated attempts with the same now-expired session must also be rejected.
  const refreshConnection2: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "guest refresh repeated after expiration must be rejected",
    [401, 403],
    async () => {
      await authorize_guest_refresh(refreshConnection2, {
        body: {} satisfies IShoppingMallGuest.IRefresh,
      });
    },
  );
}
