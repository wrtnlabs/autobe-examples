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

export async function test_api_customer_login_banned_account_denied(
  connection: api.IConnection,
): Promise<void> {
  const email: string = `${RandomGenerator.alphabets(8)}@test.com`;
  const password: string = RandomGenerator.alphaNumeric(12);
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com/signup",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "customer login should be denied for invalid credentials",
    [400, 401, 403],
    async () => {
      await authorize_customer_login(loginConnection, {
        body: {
          email,
          password: `${password}x`,
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );
}
