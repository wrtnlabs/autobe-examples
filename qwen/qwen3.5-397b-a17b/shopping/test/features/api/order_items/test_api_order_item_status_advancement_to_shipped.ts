import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test the primary seller order fulfillment workflow where a seller updates
 * an order item status from PAID to SHIPPED.
 *
 * Workflow:
 * 1. Create and authenticate seller account
 * 2. Create and authenticate customer account
 * 3. Customer creates an order (items start in PAID status)
 * 4. Seller updates order item status to SHIPPED
 * 5. Validate status change and timestamp update
 */
export async function test_api_order_item_status_advancement_to_shipped(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Customer creates an order (requires address setup via order creation)
  // Note: This will use the generate_random utility which handles cart/order setup
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 4. Validate order has items in PAID status
  TestValidator.predicate("order has items", order.items.length > 0);
  const orderItem = order.items[0];
  TestValidator.equals("initial status is PAID", orderItem.status, "PAID");
  // Store original updated_at for comparison
  const originalUpdatedAt = orderItem.updatedAt;
  // 5. Seller updates order item status to SHIPPED
  const updatedOrderItem =
    await api.functional.shoppingMall.seller.order_items.update(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          status: "SHIPPED",
        } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(updatedOrderItem);
  // 6. Validate status changed to SHIPPED
  TestValidator.equals(
    "status changed to SHIPPED",
    updatedOrderItem.status,
    "SHIPPED",
  );
  // 7. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedOrderItem.updatedAt,
    originalUpdatedAt,
  );
  // 8. Validate other fields preserved
  TestValidator.equals(
    "order item id preserved",
    updatedOrderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "quantity preserved",
    updatedOrderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "unit price preserved",
    updatedOrderItem.unitPrice,
    orderItem.unitPrice,
  );
}
