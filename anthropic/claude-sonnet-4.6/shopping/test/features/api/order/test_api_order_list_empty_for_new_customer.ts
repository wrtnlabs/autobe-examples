import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_order_list_empty_for_new_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a brand-new customer with no prior orders
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Call the order list endpoint with an empty request body
  const result = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate the empty paginated response structure
  TestValidator.equals("data array is empty", result.data.length, 0);
  TestValidator.equals("pagination.records is 0", result.pagination.records, 0);
  TestValidator.equals("pagination.pages is 0", result.pagination.pages, 0);
  TestValidator.equals("pagination.current is 1", result.pagination.current, 1);
  TestValidator.equals("pagination.limit is 20", result.pagination.limit, 20);
}
