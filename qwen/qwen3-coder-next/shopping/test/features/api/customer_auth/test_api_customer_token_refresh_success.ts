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
  // Step 1: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(joinResult);
  // Step 2: Store refresh token for later use
  const refreshToken = joinResult.refresh_token;
  typia.assert(refreshToken);
  // Step 3: Create new connection for refresh endpoint
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 4: Call refresh endpoint with valid refresh token
  const refreshResult =
    await api.functional.ecommerceMall.auth.customer.refresh(
      refreshConnection,
      {
        body: {
          refresh_token: refreshToken,
        } satisfies IEcommerceMallCustomer.IRefresh,
      },
    );
  typia.assert(refreshResult);
  // Step 5: Validate access token expiration (should be ~15 minutes from now)
  const now = new Date();
  const accessExpiredAt = new Date(refreshResult.expired_at);
  const accessDuration =
    (accessExpiredAt.getTime() - now.getTime()) / (1000 * 60); // minutes
  TestValidator.predicate(
    "access token expires in ~15 minutes",
    accessDuration >= 14 && accessDuration <= 16,
  );
  // Step 6: Validate refresh token in response has correct expiration (~7 days)
  const token = refreshResult.token;
  typia.assert(token);
  const refreshExpiresAt = new Date(token.expired_at);
  const refreshDuration =
    (refreshExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24); // days
  TestValidator.predicate(
    "refresh token expires in ~7 days",
    refreshDuration >= 6 && refreshDuration <= 8,
  );
  // Step 7: Validate customer summary matches original
  TestValidator.equals(
    "customer summary matches original",
    refreshResult.customer.id,
    joinResult.customer.id,
  );
  TestValidator.equals(
    "customer email matches original",
    refreshResult.customer.email,
    joinResult.customer.email,
  );
  TestValidator.equals(
    "customer is_suspended status matches",
    refreshResult.customer.is_suspended,
    joinResult.customer.is_suspended,
  );
}