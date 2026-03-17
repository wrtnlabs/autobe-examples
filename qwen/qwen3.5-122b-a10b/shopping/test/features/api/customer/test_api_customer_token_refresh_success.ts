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

export async function test_api_customer_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins to get initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // Store initial tokens and customer info
  const initialRefreshToken = joinResult.token.refresh;
  const initialCustomerId = joinResult.id;
  const initialEmail = joinResult.email;
  // 2. Refresh the token using the refresh endpoint
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_customer_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IEcommerceMallCustomer.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Validate new tokens are returned
  TestValidator.predicate(
    "new access token exists",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    refreshResult.token.refresh.length > 0,
  );
  // 4. Validate customer information matches
  TestValidator.equals(
    "customer ID matches",
    refreshResult.id,
    initialCustomerId,
  );
  TestValidator.equals(
    "customer email matches",
    refreshResult.email,
    initialEmail,
  );
  // 5. Validate token expiration times
  const now = new Date();
  const accessTokenExpiry = new Date(refreshResult.token.expired_at);
  const refreshableUntil = new Date(refreshResult.token.refreshable_until);
  // Access token should expire in approximately 15 minutes (900 seconds)
  const accessTokenMinutes =
    (accessTokenExpiry.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate(
    "access token expires in ~15 minutes",
    accessTokenMinutes >= 14 && accessTokenMinutes <= 16,
  );
  // Refresh token should be valid for approximately 7 days (10080 minutes)
  const refreshTokenDays =
    (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refresh token valid for ~7 days",
    refreshTokenDays >= 6.9 && refreshTokenDays <= 7.1,
  );
  // 6. Validate token rotation - old refresh token should be invalid
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("old refresh token invalid", 401, async () => {
    await authorize_customer_refresh(invalidRefreshConnection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IEcommerceMallCustomer.IRefresh,
    });
  });
  // 7. Validate new refresh token works (rotation applied)
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResult = await authorize_customer_refresh(
    secondRefreshConnection,
    {
      body: {
        refresh_token: refreshResult.token.refresh,
      } satisfies IEcommerceMallCustomer.IRefresh,
    },
  );
  typia.assert(secondRefreshResult);
  TestValidator.predicate(
    "second refresh succeeds",
    secondRefreshResult.token.access.length > 0,
  );
  // 8. Validate the second refresh also rotates the token
  await TestValidator.httpError(
    "second old refresh token invalid",
    401,
    async () => {
      await authorize_customer_refresh(invalidRefreshConnection, {
        body: {
          refresh_token: refreshResult.token.refresh,
        } satisfies IEcommerceMallCustomer.IRefresh,
      });
    },
  );
}
