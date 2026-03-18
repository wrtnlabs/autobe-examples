import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_revoked_session_rejected(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string &
        tags.Format<"email">,
      password: "P@ssw0rd123!" satisfies string & tags.Format<"password">,
      href: "http://localhost" satisfies string & tags.Format<"uri">,
      referrer: "http://localhost" satisfies string & tags.Format<"uri">,
      ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joined);
  const originalRefreshToken = joined.token.refresh;
  const renewed = await authorize_customer_refresh(customerConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(renewed);
  await TestValidator.httpError(
    "stale refresh token should be rejected after refresh token rotation",
    [401, 403],
    async () => {
      await authorize_customer_refresh(customerConnection, {
        body: {
          refreshToken: originalRefreshToken,
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );
}
