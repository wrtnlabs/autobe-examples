import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_items_filter_by_status_refunded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Use customer's token for authentication
  customerConnection.headers = { Authorization: customer.token.access };
  // 3. Generate a random order ID
  const randomOrderId = typia.random<string & tags.Format<"uuid">>();
  // 4. Filter order items by status='refunded'
  const filteredItems =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: randomOrderId,
        body: {
          status: "refunded",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(filteredItems);
  // 5. Validate response: 0 items returned when no refunds exist
  TestValidator.equals("refunded items count", filteredItems.data.length, 0);
  TestValidator.equals(
    "pagination current",
    filteredItems.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", filteredItems.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    filteredItems.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", filteredItems.pagination.pages, 0);
}
