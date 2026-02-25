import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";

export async function test_api_customer_order_item_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare order item data with linked order and product variant
  // Use generation function to create order item
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      { body: { status: "paid" } },
    );
  // 3. Validate the response type and structure
  typia.assert(orderItem);
  TestValidator.predicate(
    "order item id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      orderItem.id,
    ),
  );
  TestValidator.predicate(
    "order item quantity positive",
    orderItem.quantity > 0,
  );
  TestValidator.equals("order item status", orderItem.status, "paid");
  // 4. Validate linked order summary
  const order = orderItem.order;
  typia.assert(order);
  TestValidator.predicate(
    "order id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      order.id,
    ),
  );
  TestValidator.predicate(
    "order orderNumber present",
    order.orderNumber.length > 0,
  );
  TestValidator.predicate("order totalPrice positive", order.totalPrice > 0);
  TestValidator.predicate(
    "order totalQuantity positive",
    order.totalQuantity > 0,
  );
  TestValidator.predicate(
    "orderStatus string",
    typeof order.orderStatus === "string",
  );
  TestValidator.predicate(
    "order createdAt ISO datetime",
    typeof order.createdAt === "string" && order.createdAt.length > 0,
  );
  TestValidator.predicate(
    "order updatedAt ISO datetime",
    typeof order.updatedAt === "string" && order.updatedAt.length > 0,
  );
  // 5. Validate linked product variant summary
  const variant = orderItem.productVariant;
  typia.assert(variant);
  TestValidator.predicate(
    "product variant id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      variant.id,
    ),
  );
  TestValidator.predicate(
    "product variant skuCode non-empty",
    typeof variant.skuCode === "string" && variant.skuCode.length > 0,
  );
  TestValidator.predicate(
    "product variant stockQuantity non-negative",
    typeof variant.stockQuantity === "number" && variant.stockQuantity >= 0,
  );
  // 6. Confirm timestamps
  TestValidator.predicate(
    "createdAt timestamp ISO",
    typeof orderItem.createdAt === "string" && orderItem.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt timestamp ISO",
    typeof orderItem.updatedAt === "string" && orderItem.updatedAt.length > 0,
  );
  // 7. Confirm deletedAt is null or undefined (optional field)
  TestValidator.predicate(
    "deletedAt is null or undefined",
    orderItem.deletedAt === null || orderItem.deletedAt === undefined,
  );
}
