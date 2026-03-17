import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_session_index_customer_denied_platform_oversight(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  await TestValidator.httpError(
    "customer cannot access platform session oversight with broad query",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.customer.sessions.index(
        customerConnection,
        {
          body: {
            page: 1,
            limit: 10,
            sortBy: "createdAt",
            sortDirection: "desc",
          } satisfies IShoppingMallSellerSession.IRequest,
        },
      );
    },
  );
  await TestValidator.httpError(
    "customer cannot access platform session oversight with targeted query",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.customer.sessions.index(
        customerConnection,
        {
          body: {
            sellerId: customer.id,
            page: 1,
            limit: 1,
            sortBy: "expiredAt",
            sortDirection: "asc",
          } satisfies IShoppingMallSellerSession.IRequest,
        },
      );
    },
  );
}
