import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_token_refresh_success_with_replay_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer and capture tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  const oldRefreshToken = authorized.token.refresh;
  // 2. Refresh token to obtain new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_customer_refresh(refreshConnection, {
    body: { token: oldRefreshToken } satisfies IECommerceMallCustomer.IRefresh,
  });
  typia.assert(refreshed);
  // 3. Verify the refreshed response contains new valid tokens
  TestValidator.notEquals(
    "access token changed",
    refreshed.token.access,
    authorized.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    refreshed.token.refresh,
    authorized.token.refresh,
  );
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(refreshed.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(refreshed.token.refreshable_until).getTime() > Date.now(),
  );
  TestValidator.equals("customer id matches", refreshed.id, authorized.id);
  TestValidator.equals(
    "customer email matches",
    refreshed.email,
    authorized.email,
  );
  // 4. Replay the old refresh token — must be rejected
  const replayConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "old refresh token is rejected with 401 (replay protection)",
    401,
    async () => {
      await authorize_customer_refresh(replayConnection, {
        body: {
          token: oldRefreshToken,
        } satisfies IECommerceMallCustomer.IRefresh,
      });
    },
  );
}
