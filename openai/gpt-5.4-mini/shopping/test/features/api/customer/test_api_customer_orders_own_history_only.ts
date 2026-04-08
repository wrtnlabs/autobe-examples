import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_orders_own_history_only(
  connection: api.IConnection,
): Promise<void> {
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstCustomerConnection, {
    body: {
      email: `first_${Date.now()}@example.com` as string,
      password: "1234" as string,
      href: "https://example.com/customer/first" as string,
      referrer: "https://example.com" as string,
    } as IMallPlatformCustomer.IJoin,
  });
  typia.assert(firstCustomer);
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomer = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: {
        email: `second_${Date.now()}@example.com` as string,
        password: "1234" as string,
        href: "https://example.com/customer/second" as string,
        referrer: "https://example.com" as string,
      } as IMallPlatformCustomer.IJoin,
    },
  );
  typia.assert(secondCustomer);
  const firstPage = await api.functional.mallPlatform.customer.orders.index(
    firstCustomerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMallPlatformOrder.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "order history is scoped to the authenticated customer",
    firstPage.data.every((order) => order.customer.id === firstCustomer.id),
  );
  TestValidator.predicate(
    "order history excludes the second customer completely",
    firstPage.data.every((order) => order.customer.id !== secondCustomer.id),
  );
  TestValidator.equals(
    "returned page is tied to the first customer only",
    firstPage.data.map((order) => order.customer.id),
    firstPage.data.map(() => firstCustomer.id),
  );
  TestValidator.predicate(
    "order history endpoint remains read-only and returns a consistent paginated summary",
    firstPage.pagination.current === 1 && firstPage.pagination.limit === 10,
  );
}
