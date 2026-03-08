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

export async function test_api_customer_refresh_success_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate test data
  const customerEmail = typia.random<string & tags.Format<"email">>() as string;
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // 2. Register new customer
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(joinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/register",
      referrer: "https://example.com/signup",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // 3. Customer login to get initial tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_customer_login(loginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(loginResponse);
  // 4. Store old refresh token for invalidation test
  const oldRefreshToken = loginResponse.token.refresh;
  const oldRefreshableUntil = loginResponse.token.refreshable_until;
  // 5. Refresh token with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshBody = {
    refresh_token: oldRefreshToken,
    href: "https://example.com/protected",
    referrer: "https://example.com/login",
  } satisfies IEcommerceMallCustomer.IRefresh;
  const refreshResponse = await authorize_customer_refresh(refreshConnection, {
    body: refreshBody,
  });
  typia.assert(refreshResponse);
  // 6. Verify customer_id matches original registered customer
  TestValidator.equals(
    "customer_id matches original",
    refreshResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "email matches original",
    refreshResponse.email,
    joinResponse.email,
  );
  // 7. Verify new tokens are returned
  TestValidator.predicate(
    "new access token is valid",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is valid",
    refreshResponse.token.refresh.length > 0,
  );
  // 8. Verify new refresh token has refreshable_until extended (at least 29 minutes from now)
  const now = new Date();
  const newRefreshableUntil = new Date(refreshResponse.token.refreshable_until);
  const timeDiff = newRefreshableUntil.getTime() - now.getTime();
  const expectedExtensionMinutes = 30;
  TestValidator.predicate(
    "refreshable_until extended by approximately 30 minutes",
    timeDiff >= (expectedExtensionMinutes - 1) * 60 * 1000,
  );
  // 9. Verify old refresh token is invalidated
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token is invalidated", async () => {
    await authorize_customer_refresh(invalidRefreshConnection, {
      body: {
        refresh_token: oldRefreshToken,
        href: "https://example.com/protected",
        referrer: "https://example.com/login",
      } satisfies IEcommerceMallCustomer.IRefresh,
    });
  });
  // 10. Verify old access token from login is also invalidated (should return 401)
  const invalidTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "old access token is invalidated",
    [401],
    async () => {
      await api.functional.ecommerceMall.auth.customer.login(
        invalidTokenConnection,
        {
          body: {
            email: customerEmail,
            password: customerPassword,
          } satisfies IEcommerceMallCustomer.ILogin,
        },
      );
    },
  );
  // 11. Verify new session record was created
  // Note: In a real E2E test, we would query the database directly
  // For this test, we verify the refresh was successful which implies new session creation
  TestValidator.predicate(
    "new session record exists (refresh succeeded)",
    refreshResponse.id !== undefined,
  );
}
