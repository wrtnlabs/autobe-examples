import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset_detail_customer_access_denied(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "joined customer email matches input",
    authorized.email,
    joinBody.email,
  );
  TestValidator.equals(
    "customer connection has authorization header",
    customerConnection.headers?.Authorization,
    authorized.token.access,
  );
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "regular customer cannot access password reset detail",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.customer.passwordResets.at(
        customerConnection,
        {
          passwordResetId,
        },
      );
    },
  );
}
