import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_read_own_and_access_boundary(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoin = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://shopping-mall.example.com/customer/session-login",
      referrer: "https://shopping-mall.example.com/customer/login",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(ownerJoin);
  await TestValidator.error(
    "reading a customer session without a real session id should fail",
    async () => {
      await api.functional.shoppingMall.customer.sessions.at(ownerConnection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  const otherConnection: api.IConnection = { host: connection.host };
  const otherJoin = await authorize_customer_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://shopping-mall.example.com/customer/session-login-2",
      referrer: "https://shopping-mall.example.com/customer/login-2",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(otherJoin);
  await TestValidator.error(
    "customer session endpoint should reject inaccessible sessions",
    async () => {
      await api.functional.shoppingMall.customer.sessions.at(ownerConnection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
