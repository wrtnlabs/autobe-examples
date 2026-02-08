import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_success_and_failure_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful token refresh
  // - Create customer account
  // - Refresh token using valid refresh token
  // - Verify new tokens and expiry timestamps
  // Create customer account and obtain authorization tokens
  const baseConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin =
    typia.random<IShoppingMallCustomer.IJoin>();
  const authorized = await authorize_customer_join(baseConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Use the refresh token to get new tokens
  const refreshConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.refresh },
  };
  const refreshResponse = await authorize_customer_refresh(refreshConnection, {
    body: {},
  });
  typia.assert(refreshResponse);
  // Validate tokens presence and format
  TestValidator.predicate(
    "refresh access token exists",
    typeof refreshResponse.token.access === "string" &&
      refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh refresh token exists",
    typeof refreshResponse.token.refresh === "string" &&
      refreshResponse.token.refresh.length > 0,
  );
  // Validate expiration timestamps are ISO 8601 date-time strings
  TestValidator.predicate(
    "access token expired_at is valid ISO string",
    !isNaN(Date.parse(refreshResponse.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token refreshable_until is valid ISO string",
    !isNaN(Date.parse(refreshResponse.token.refreshable_until)),
  );
  // Scenario 2: Attempt to refresh using expired token
  // Since we cannot wait for expiration, simulate by using an obviously expired or invalid token
  const expiredToken = "expired-refresh-token-example";
  await TestValidator.error(
    "refresh with expired token should fail",
    async () => {
      const expiredRefreshConnection: api.IConnection = {
        host: connection.host,
        headers: { Authorization: expiredToken },
      };
      await authorize_customer_refresh(expiredRefreshConnection, {
        body: {},
      });
    },
  );
  // Scenario 3: Attempt to refresh with invalid token
  const invalidToken = "invalid-refresh-token-example";
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      const invalidRefreshConnection: api.IConnection = {
        host: connection.host,
        headers: { Authorization: invalidToken },
      };
      await authorize_customer_refresh(invalidRefreshConnection, {
        body: {},
      });
    },
  );
}
