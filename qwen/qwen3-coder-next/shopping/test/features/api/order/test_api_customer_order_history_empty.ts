import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
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

export async function test_api_customer_order_history_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer with no order history
  const newCustomerConnection: api.IConnection = { host: connection.host };
  const customerData: IShoppingMallCustomer.IJoin = {
    email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
    password: "12345678",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  };
  await authorize_customer_join(newCustomerConnection, { body: customerData });
  // 2. Fetch order history for the new customer (should be empty)
  const result: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.history.index(
      newCustomerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result);
  // 3. Validate empty order history
  TestValidator.equals("records count is zero", result.pagination.records, 0);
  TestValidator.equals("pages count is zero", result.pagination.pages, 0);
  TestValidator.equals("data array is empty", result.data.length, 0);
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 10", result.pagination.limit, 10);
}