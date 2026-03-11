import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  const oldRefreshToken = joinResult.token.refresh;
  const oldExpiredAt = joinResult.token.expired_at;
  // Wait a brief moment to ensure time difference (but within 10 minutes for recent activity)
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 2. Token refresh
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_customer_refresh(refreshConnection, {
    body: { refresh_token: oldRefreshToken },
  });
  typia.assert(refreshResult);
  // 3. Validate new tokens exist
  TestValidator.predicate(
    "new access token provided",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token provided",
    refreshResult.token.refresh.length > 0,
  );
  // 4. Validate old tokens are invalidated
  TestValidator.notEquals(
    "old refresh token invalidated",
    refreshResult.token.refresh,
    oldRefreshToken,
  );
  // 5. Validate expiration extension
  const oldExpiredTime = new Date(oldExpiredAt).getTime();
  const newExpiredTime = new Date(refreshResult.token.expired_at).getTime();
  const nowTime = Date.now();
  const expectedExpiration = nowTime + 30 * 60 * 1000; // 30 minutes from now
  TestValidator.predicate(
    "new access token has future expiration",
    new Date(refreshResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until extends beyond current time",
    new Date(refreshResult.token.refreshable_until) > new Date(),
  );
  // 6. Validate new refresh token cannot be used to refresh again (must use it properly)
  // Try to use the OLD refresh token - should fail
  await TestValidator.error("old refresh token cannot be reused", async () => {
    const invalidRefreshConnection: api.IConnection = { host: connection.host };
    await authorize_customer_refresh(invalidRefreshConnection, {
      body: { refresh_token: oldRefreshToken },
    });
  });
}
