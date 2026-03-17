import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";

export async function test_api_order_items_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create an order with multiple items
  const order = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: RandomGenerator.paragraph({ sentences: 2 }),
        shipping_city: RandomGenerator.name(),
        shipping_state: RandomGenerator.name(),
        shipping_postal_code: RandomGenerator.alphabets(5),
        shipping_country: RandomGenerator.name(),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 3. Retrieve order items for the created order
  const orderItemsResponse: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsResponse);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    orderItemsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has limit",
    orderItemsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    orderItemsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    orderItemsResponse.pagination.pages >= 0,
  );
  // 5. Validate data array is not empty (order has items)
  TestValidator.predicate(
    "order has items",
    orderItemsResponse.data.length > 0,
  );
  // 6. Validate each order item structure
  for (const item of orderItemsResponse.data) {
    // Validate order item summary fields
    TestValidator.predicate(
      "item has valid id",
      /^[0-9a-f-]{36}$/i.test(item.id),
    );
    TestValidator.predicate("item quantity is positive", item.quantity > 0);
    TestValidator.predicate("item unitPrice is positive", item.unitPrice > 0);
    TestValidator.predicate("item has status", item.status.length > 0);
    TestValidator.predicate("item has createdAt", item.createdAt.length > 0);
    TestValidator.predicate("item has updatedAt", item.updatedAt.length > 0);
    // Validate order summary - typia.assert already validates structure
    TestValidator.predicate(
      "item has order",
      item.order !== null && item.order !== undefined,
    );
    if (item.order) {
      TestValidator.predicate("order has id", item.order.id.length > 0);
      TestValidator.predicate(
        "order has orderNumber",
        item.order.orderNumber.length > 0,
      );
      TestValidator.predicate("order has status", item.order.status.length > 0);
      TestValidator.predicate(
        "order has totalPrice",
        item.order.totalPrice > 0,
      );
      TestValidator.predicate(
        "order has createdAt",
        item.order.createdAt.length > 0,
      );
      TestValidator.predicate("order has itemCount", item.order.itemCount >= 0);
      TestValidator.predicate(
        "order has customer",
        item.order.customer !== null && item.order.customer !== undefined,
      );
    }
    // Validate product variant summary - typia.assert already validates structure
    TestValidator.predicate(
      "item has productVariant",
      item.productVariant !== null && item.productVariant !== undefined,
    );
    if (item.productVariant) {
      TestValidator.predicate(
        "variant has id",
        item.productVariant.id.length > 0,
      );
      TestValidator.predicate(
        "variant has sku_code",
        item.productVariant.sku_code.length > 0,
      );
      TestValidator.predicate(
        "variant has stock_quantity",
        item.productVariant.stock_quantity >= 0,
      );
      TestValidator.predicate(
        "variant has option_values",
        item.productVariant.option_values !== null &&
          item.productVariant.option_values !== undefined,
      );
    }
  }
  // 7. Validate items are sorted by created_at descending
  for (let i = 1; i < orderItemsResponse.data.length; i++) {
    const previous = orderItemsResponse.data[i - 1];
    const current = orderItemsResponse.data[i];
    TestValidator.predicate(
      `item ${i - 1} created_at >= item ${i} created_at`,
      previous.createdAt >= current.createdAt,
    );
  }
}
