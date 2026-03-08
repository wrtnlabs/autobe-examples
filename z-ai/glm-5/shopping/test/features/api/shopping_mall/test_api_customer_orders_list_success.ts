import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEShoppingMallOrderStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEShoppingMallOrderStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_orders_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Call orders list endpoint with default parameters
  const ordersPage = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(ordersPage);
  // 3. Validate default pagination values (business logic)
  TestValidator.equals("default page is 1", ordersPage.pagination.current, 1);
  TestValidator.predicate("limit is positive", ordersPage.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    ordersPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    ordersPage.pagination.pages >= 0,
  );
  // 4. Validate orders are sorted by created_at descending (newest first)
  for (let i = 1; i < ordersPage.data.length; i++) {
    const prevDate = new Date(ordersPage.data[i - 1].created_at).getTime();
    const currDate = new Date(ordersPage.data[i].created_at).getTime();
    TestValidator.predicate(
      "orders sorted descending by created_at",
      prevDate >= currDate,
    );
  }
}
