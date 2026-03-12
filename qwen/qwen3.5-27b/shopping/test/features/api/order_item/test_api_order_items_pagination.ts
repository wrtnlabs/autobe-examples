import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test pagination functionality for order items retrieval.
 * 1. Register and authenticate as customer
 * 2. Create an order with multiple items (>20) for pagination testing
 * 3. Test default pagination (page 1, limit 20)
 * 4. Test page 2 retrieval with default limit
 * 5. Test custom limit values (5, 50)
 * 6. Test edge case: page beyond total pages returns empty data
 * 7. Test sorting with pagination (created_at asc/desc)
 * 8. Validate pagination metadata accuracy
 */
export async function test_api_order_items_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create an order with multiple items
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  const orderId: string & tags.Format<"uuid"> = order.id;
  // 3. Test default pagination (page 1, limit 20)
  const page1 = await api.functional.shoppingMall.customer.orders.items.index(
    customerConnection,
    {
      orderId,
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 20", page1.pagination.limit, 20);
  TestValidator.predicate("has data", page1.data.length > 0);
  TestValidator.predicate(
    "records count matches data",
    page1.pagination.records >= page1.data.length,
  );
  // 4. Test page 2 retrieval with default limit
  const page2 = await api.functional.shoppingMall.customer.orders.items.index(
    customerConnection,
    {
      orderId,
      body: {
        page: 2,
        limit: 20,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("current page is 2", page2.pagination.current, 2);
  TestValidator.equals("limit is 20", page2.pagination.limit, 20);
  // 5. Test custom limit values
  // Test with limit = 5
  const customLimit5 =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(customLimit5);
  TestValidator.equals("custom limit is 5", customLimit5.pagination.limit, 5);
  TestValidator.predicate("data count <= limit", customLimit5.data.length <= 5);
  TestValidator.equals(
    "pages calculation correct",
    customLimit5.pagination.pages,
    Math.ceil(customLimit5.pagination.records / 5),
  );
  // Test with limit = 50
  const customLimit50 =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          page: 1,
          limit: 50,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(customLimit50);
  TestValidator.equals(
    "custom limit is 50",
    customLimit50.pagination.limit,
    50,
  );
  TestValidator.equals(
    "pages calculation correct",
    customLimit50.pagination.pages,
    Math.ceil(customLimit50.pagination.records / 50),
  );
  // 6. Test edge case: page beyond total pages
  const beyondPages =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          page: 9999,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(beyondPages);
  TestValidator.equals(
    "current page is 9999",
    beyondPages.pagination.current,
    9999,
  );
  TestValidator.equals(
    "data is empty when page exceeds",
    beyondPages.data.length,
    0,
  );
  // 7. Test sorting with pagination (created_at asc)
  const sortedAsc =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedAsc);
  TestValidator.equals(
    "sort by created_at asc - current page",
    sortedAsc.pagination.current,
    1,
  );
  TestValidator.equals(
    "sort by created_at asc - limit",
    sortedAsc.pagination.limit,
    10,
  );
  // Test sorting with pagination (created_at desc)
  const sortedDesc =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedDesc);
  TestValidator.equals(
    "sort by created_at desc - current page",
    sortedDesc.pagination.current,
    1,
  );
  TestValidator.equals(
    "sort by created_at desc - limit",
    sortedDesc.pagination.limit,
    10,
  );
  // 8. Validate pagination metadata consistency
  TestValidator.predicate("records >= 0", page1.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", page1.pagination.pages >= 0);
  TestValidator.predicate("current >= 1", page1.pagination.current >= 1);
  TestValidator.predicate("limit >= 1", page1.pagination.limit >= 1);
}
