import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";

/**
 * Tests successful listing of order items for a customer order.
 *
 * Validates the complete order item listing flow including customer authentication, order creation with items, and paginated retrieval of order item summaries. Ensures that the returned items correspond to the created order with accurate product variant details, quantities, prices, and fulfillment statuses.
 *
 * Special attention is given to verifying that the paginated response structure is correct, containing both pagination metadata and the expected order item data matching the original order context.
 *
 * 1. Customer registers with email and credentials.
 * 2. Customer creates an order with multiple product variant items and a shipping address.
 * 3. Customer retrieves paginated list of order items using the order number.
 * 4. Validates that paginated response contains correct item count, product, quantity, and price details.
 */
export async function test_api_order_item_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(registered);
  // 2. Create order with items
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 3. List order items by order number
  const requestBody = {} satisfies IEcommercePlatformOrderItem.IRequest;
  const response =
    await api.functional.ecommercePlatform.customer.orders.items.index(
      customerConnection,
      {
        orderNumber: order.order_number,
        body: requestBody,
      },
    );
  typia.assert(response);
  // 4. Validate paginated response
  TestValidator.equals(
    "pagination records match items count",
    response.pagination.records,
    response.data.length,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("items list not empty", response.data.length > 0);
  // 5. Validate each item matches order context
  const orderItemIds = order.items.map((item) => item.id);
  const returnedIds = response.data.map((item) => item.id);
  TestValidator.equals(
    "all order item IDs are returned",
    orderItemIds.sort(),
    returnedIds.sort(),
  );
  // Validate individual item properties
  for (const item of response.data) {
    TestValidator.predicate(
      `item ${item.id} has valid quantity`,
      item.quantity >= 1,
    );
    TestValidator.predicate(
      `item ${item.id} has non-negative price`,
      item.price >= 0,
    );
    TestValidator.predicate(
      `item ${item.id} belongs to correct order`,
      item.order.orderNumber === order.order_number,
    );
    TestValidator.predicate(
      `item ${item.id} has product variant`,
      item.productVariant.id !== undefined,
    );
  }
}
