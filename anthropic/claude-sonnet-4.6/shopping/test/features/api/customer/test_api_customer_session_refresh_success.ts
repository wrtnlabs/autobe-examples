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

export async function test_api_customer_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer and capture the initial authorized session
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {});
  typia.assert(joinResult);
  // Capture original tokens and profile info for later comparison
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  const originalId = joinResult.id;
  const originalEmail = joinResult.email;
  const originalNickname = joinResult.nickname;
  // Step 2: Call the refresh endpoint with a fresh connection
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_customer_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(refreshResult);
  // Step 3: Validate customer profile consistency
  TestValidator.equals("customer id matches", refreshResult.id, originalId);
  TestValidator.equals(
    "customer email matches",
    refreshResult.email,
    originalEmail,
  );
  TestValidator.equals(
    "customer nickname matches",
    refreshResult.nickname,
    originalNickname,
  );
  TestValidator.equals("customer is not banned", refreshResult.isBanned, false);
  TestValidator.equals(
    "customer deletedAt is null",
    refreshResult.deletedAt,
    null,
  );
  // Step 4: Validate token rotation - new tokens must differ from originals
  TestValidator.notEquals(
    "access token rotated",
    refreshResult.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
}
