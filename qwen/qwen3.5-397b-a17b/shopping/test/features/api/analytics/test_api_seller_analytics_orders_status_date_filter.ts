import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_seller_analytics_orders_status_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for later login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1Password = RandomGenerator.alphaNumeric(16);
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2Password = RandomGenerator.alphaNumeric(16);
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Create products for the seller
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product2);
  // 3. Register first customer and login
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: customer1Email,
      password: customer1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const customer1LoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customer1LoginConnection, {
    body: {
      email: customer1Email,
      password: customer1Password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 4. Register second customer and login
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: customer2Email,
      password: customer2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const customer2LoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customer2LoginConnection, {
    body: {
      email: customer2Email,
      password: customer2Password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 5. Create orders from both customers
  // The generate function handles address and cart setup internally
  const order1 = await generate_random_shopping_mall_customer_orders_create(
    customer1LoginConnection,
    {},
  );
  typia.assert(order1);
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customer2LoginConnection,
    {},
  );
  typia.assert(order2);
  // 6. Update order item status to 'shipped' for one order item
  if (order1.orderItems.length > 0) {
    const orderItem = order1.orderItems[0];
    const updatedItem =
      await api.functional.shoppingMall.seller.orders.items.update(
        sellerLoginConnection,
        {
          itemId: orderItem.id,
          body: {
            status: "shipped",
          } satisfies IShoppingMallOrderItem.IUpdate,
        },
      );
    typia.assert(updatedItem);
  }
  // 7. Query analytics with status and date filters
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const analytics =
    await api.functional.shoppingMall.seller.analytics.orders.index(
      sellerLoginConnection,
      {
        body: {
          status: ["paid", "shipped"],
          ordered_at_from: sevenDaysAgo.toISOString(),
          ordered_at_to: now.toISOString(),
          sort: "ordered_at",
          direction: "desc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(analytics);
  // 8. Validate response structure
  TestValidator.predicate("has pagination", analytics.pagination !== undefined);
  TestValidator.predicate("has data array", Array.isArray(analytics.data));
  // 9. Validate all returned orders have correct status (paid or shipped only)
  for (const order of analytics.data) {
    TestValidator.predicate(
      `order ${order.order_number} status is paid or shipped`,
      order.status === "paid" || order.status === "shipped",
    );
    // 10. Validate order date is within specified range
    const orderDate = new Date(order.ordered_at);
    TestValidator.predicate(
      `order ${order.order_number} ordered_at >= from date`,
      orderDate >= sevenDaysAgo,
    );
    TestValidator.predicate(
      `order ${order.order_number} ordered_at <= to date`,
      orderDate <= now,
    );
  }
  // 11. Validate sorting is descending by ordered_at
  if (analytics.data.length > 1) {
    for (let i = 0; i < analytics.data.length - 1; i++) {
      const currentDate = new Date(analytics.data[i].ordered_at);
      const nextDate = new Date(analytics.data[i + 1].ordered_at);
      TestValidator.predicate(
        `orders sorted descending at index ${i}`,
        currentDate >= nextDate,
      );
    }
  }
  // 12. Validate pagination metadata
  TestValidator.predicate(
    "current page is positive",
    analytics.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is within bounds",
    analytics.pagination.limit >= 1 && analytics.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    analytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "records >= data length",
    analytics.pagination.records >= analytics.data.length,
  );
}