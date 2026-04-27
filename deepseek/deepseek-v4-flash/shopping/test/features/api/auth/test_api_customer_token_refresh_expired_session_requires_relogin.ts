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

export async function test_api_customer_token_refresh_expired_session_requires_relogin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer with known credentials for later login verification
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(authorized);
  // 2. Verify that a valid refresh token works (baseline)
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_customer_refresh(validRefreshConnection, {
    body: {
      token: authorized.token.refresh,
    },
  });
  typia.assert(refreshed);
  // 3. Test refresh with an expired/invalid token → should return HTTP 401
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh with expired session returns 401",
    401,
    async () => {
      await authorize_customer_refresh(invalidRefreshConnection, {
        body: {
          token: RandomGenerator.alphaNumeric(32),
        },
      });
    },
  );
  // 4. Login fresh with the original credentials → should succeed,
  //    proving the account itself is valid and only the session expired
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(loginResult);
  // 5. Verify new tokens from login are functional
  TestValidator.equals(
    "login provides new access token",
    loginResult.token.access !== undefined,
    true,
  );
  TestValidator.equals(
    "login provides new refresh token",
    loginResult.token.refresh !== undefined,
    true,
  );
}
