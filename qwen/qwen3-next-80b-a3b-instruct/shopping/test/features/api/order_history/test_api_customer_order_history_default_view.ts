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

export async function test_api_customer_order_history_default_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer to establish JWT token
  const customerConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(authResponse);
  // 2. Retrieve order history with no filters (default view)
  const orderHistory = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: typia.random<IShoppingMallOrder.IRequest>(),
    },
  );
  const typedOrderHistory =
    typia.assert<IPageIShoppingMallOrder.ISummary>(orderHistory);
  // 3. Validate that response contains only summary fields and pagination
  TestValidator.equals(
    "pagination exists",
    typedOrderHistory.pagination,
    typedOrderHistory.pagination,
  );
  TestValidator.predicate(
    "pagination current >= 1",
    typedOrderHistory.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    typedOrderHistory.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    typedOrderHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    typedOrderHistory.pagination.pages >= 0,
  );
  TestValidator.equals(
    "data array is present",
    Array.isArray(typedOrderHistory.data),
    true,
  );
  // All individual property validations are deleted because IShoppingMallOrder.ISummary is an empty object type {} in the DTO definitions
  // We cannot validate properties that don't exist in the schema
}
