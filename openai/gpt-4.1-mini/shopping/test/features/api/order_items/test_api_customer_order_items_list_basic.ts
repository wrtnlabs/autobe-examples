import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_items_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = {} satisfies IShoppingMallCustomer.IJoin;
  const joinOutput = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  // 2. Use the token for authenticated calls
  customerConnection.headers = { Authorization: joinOutput.token.access };
  // 3. Generate random orderId (does not belong to this customer, used for tests)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 4. Empty request body satisfies request DTO
  const body = {} satisfies IShoppingMallOrderItem.IRequest;
  // 5. Call the order items list endpoint
  const output = await api.functional.shoppingMall.customer.orders.items.index(
    customerConnection,
    {
      orderId,
      body,
    },
  );
  // 6. Assert overall response shape
  typia.assert(output);
  // The typia.assert also validates each item in data array
  // 7. Basic pagination validation
  const { pagination } = output;
  TestValidator.predicate(
    "pagination current non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  // 8. Authorization test: try to access order items of other customer
  const otherCustomerConn: api.IConnection = { host: connection.host };
  const otherJoinBody = {} satisfies IShoppingMallCustomer.IJoin;
  const otherJoinOutput = await authorize_customer_join(otherCustomerConn, {
    body: otherJoinBody,
  });
  otherCustomerConn.headers = { Authorization: otherJoinOutput.token.access };
  await TestValidator.error(
    "unauthorized access other customer's order items",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.index(
        otherCustomerConn,
        {
          orderId,
          body,
        },
      );
    },
  );
}
