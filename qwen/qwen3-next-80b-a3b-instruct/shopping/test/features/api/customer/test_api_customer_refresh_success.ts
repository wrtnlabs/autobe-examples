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

export async function test_api_customer_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer account via join to establish session
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // Step 2: Extract the refresh token from the join response (stored in token.refresh)
  const initialRefreshToken = joinResponse.token.refresh;
  // Step 3: Use the existing session to call refresh endpoint — body is {} as per IRefresh DTO
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_customer_refresh(refreshConnection, {
    body: {} satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(refreshResponse);
  // Step 4: Validate the refresh response
  // - New access and refresh tokens issued
  TestValidator.notEquals(
    "new access token differs from old",
    joinResponse.token.access,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    initialRefreshToken,
    refreshResponse.token.refresh,
  );
  // - New refresh token has longer validity (30 days) and access token 30 min
  TestValidator.predicate(
    "new access token expires before refreshable_until",
    () => {
      const newAccessExpired = new Date(refreshResponse.token.expired_at);
      const refreshableUntil = new Date(
        refreshResponse.token.refreshable_until,
      );
      return newAccessExpired < refreshableUntil;
    },
  );
}
