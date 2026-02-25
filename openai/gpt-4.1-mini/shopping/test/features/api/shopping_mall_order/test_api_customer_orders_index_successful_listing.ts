import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";

export async function test_api_customer_orders_index_successful_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and obtains an authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    },
  });
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // 2. Customer creates an order for listing
  const createdOrder =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {}, // random order
      },
    );
  typia.assert(createdOrder);
  // 3. Customer queries the order list
  const pageRequest: IShoppingMallOrder.IRequest = {
    page: 1,
    limit: 10,
    shoppingMallCustomerId: authorizedCustomer.id,
  };
  const page = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: pageRequest,
    },
  );
  // 4. Validate the page object
  typia.assert(page);
  // 5. Check pagination correctness
  TestValidator.predicate("page current is 1", page.pagination.current === 1);
  TestValidator.predicate("page limit is 10", page.pagination.limit === 10);
  TestValidator.predicate(
    "page records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page pages is at least 0",
    page.pagination.pages >= 0,
  );
  // 6. Check orders are for the authorized customer only
  TestValidator.predicate(
    "all orders belong to authorized customer",
    page.data.every((order) => order.customer.id === authorizedCustomer.id),
  );
  // 7. Check the created order is included in the list
  const foundOrder = page.data.find((order) => order.id === createdOrder.id);
  TestValidator.predicate("created order is listed", foundOrder !== undefined);
}
