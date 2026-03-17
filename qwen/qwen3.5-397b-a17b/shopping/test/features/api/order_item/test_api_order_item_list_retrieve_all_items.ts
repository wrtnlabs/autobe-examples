import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_item_list_retrieve_all_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create order with multiple items through checkout
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 3. Retrieve order items list
  const orderItemsResponse =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "current page",
    orderItemsResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit", orderItemsResponse.pagination.limit, 20);
  TestValidator.predicate(
    "total records matches items count",
    orderItemsResponse.pagination.records >= orderItemsResponse.data.length,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    orderItemsResponse.pagination.pages >= 1,
  );
  // 5. Validate order items data
  TestValidator.predicate(
    "has at least one order item",
    orderItemsResponse.data.length > 0,
  );
  for (const item of orderItemsResponse.data) {
    // Validate order item basic fields
    TestValidator.predicate("item id exists", item.id.length > 0);
    TestValidator.predicate("quantity is positive", item.quantity >= 1);
    TestValidator.predicate("unit price is non-negative", item.unit_price >= 0);
    TestValidator.equals("item status is PAID", item.status, "PAID");
    // Validate order summary
    TestValidator.equals("order id matches", item.order.id, order.id);
    TestValidator.predicate(
      "order number exists",
      item.order.orderNumber.length > 0,
    );
    TestValidator.predicate(
      "order total price is positive",
      item.order.totalPrice > 0,
    );
    // Validate product snapshot
    TestValidator.predicate(
      "product snapshot name exists",
      item.productSnapshot.name.length > 0,
    );
    TestValidator.predicate(
      "product snapshot base price is positive",
      item.productSnapshot.base_price > 0,
    );
    // Validate product variant snapshot
    TestValidator.predicate(
      "variant snapshot sku_code exists",
      item.productVariantSnapshot.sku_code.length > 0,
    );
    TestValidator.predicate(
      "variant snapshot stock quantity is non-negative",
      item.productVariantSnapshot.stock_quantity >= 0,
    );
    // Validate seller information
    TestValidator.predicate(
      "seller shop name exists",
      item.seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      "seller email exists",
      item.seller.email.length > 0,
    );
  }
}
