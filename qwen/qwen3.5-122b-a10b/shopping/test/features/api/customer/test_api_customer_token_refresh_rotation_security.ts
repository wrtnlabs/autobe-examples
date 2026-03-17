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

export async function test_api_customer_token_refresh_rotation_security(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform to obtain initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_customer_join(customerConnection, {
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
  typia.assert(initialAuth);
  // 2. Store the initial refresh token before first refresh
  const initialRefreshToken = initialAuth.token.refresh;
  // 3. Perform first successful token refresh to get new tokens
  const refreshedAuth = await authorize_customer_refresh(customerConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IEcommerceMallCustomer.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Validate that new tokens are different from initial tokens
  TestValidator.notEquals(
    "access token should be different after refresh",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh (rotation)",
    initialRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 5. Attempt to use the old (now-invalidated) refresh token again
  // This should fail with 401 error due to token rotation
  await TestValidator.httpError(
    "old refresh token should be rejected after rotation",
    401,
    async () => {
      await authorize_customer_refresh(customerConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IEcommerceMallCustomer.IRefresh,
      });
    },
  );
}
