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

export async function test_api_customer_session_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer and obtain the first authorized session
  const customerConnection: api.IConnection = { host: connection.host };
  const firstSession = await authorize_customer_join(customerConnection, {});
  typia.assert(firstSession);
  const firstRefreshToken = firstSession.token.refresh;
  const firstAccessToken = firstSession.token.access;
  // Step 2: First refresh — exchange first refresh token for second token pair
  const refreshConnection1: api.IConnection = { host: connection.host };
  const secondSession = await authorize_customer_refresh(refreshConnection1, {
    body: {
      refresh_token: firstRefreshToken,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(secondSession);
  const secondRefreshToken = secondSession.token.refresh;
  const secondAccessToken = secondSession.token.access;
  // Validate: tokens have rotated (second ≠ first)
  TestValidator.notEquals(
    "second refresh token differs from first",
    secondRefreshToken,
    firstRefreshToken,
  );
  TestValidator.notEquals(
    "second access token differs from first",
    secondAccessToken,
    firstAccessToken,
  );
  // Step 3: Second refresh — exchange second refresh token for third token pair
  const refreshConnection2: api.IConnection = { host: connection.host };
  const thirdSession = await authorize_customer_refresh(refreshConnection2, {
    body: {
      refresh_token: secondRefreshToken,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(thirdSession);
  const thirdRefreshToken = thirdSession.token.refresh;
  const thirdAccessToken = thirdSession.token.access;
  // Validate: tokens have rotated again (third ≠ second)
  TestValidator.notEquals(
    "third refresh token differs from second",
    thirdRefreshToken,
    secondRefreshToken,
  );
  TestValidator.notEquals(
    "third access token differs from second",
    thirdAccessToken,
    secondAccessToken,
  );
  // Validate: customer identity is consistent across all three sessions
  TestValidator.equals(
    "customer id consistent across sessions",
    firstSession.id,
    secondSession.id,
  );
  TestValidator.equals(
    "customer id consistent in third session",
    firstSession.id,
    thirdSession.id,
  );
  TestValidator.equals(
    "customer email consistent across sessions",
    firstSession.email,
    secondSession.email,
  );
  TestValidator.equals(
    "customer email consistent in third session",
    firstSession.email,
    thirdSession.email,
  );
  TestValidator.equals(
    "customer nickname consistent across sessions",
    firstSession.nickname,
    secondSession.nickname,
  );
  TestValidator.equals(
    "customer nickname consistent in third session",
    firstSession.nickname,
    thirdSession.nickname,
  );
}
