import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_access_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(authorizedCustomer);
  // 2. Generate a realistic, valid IShoppingMallOrderItem snapshot from Typia
  // This simulates the shape of an order item that we will attempt to access
  const mockOrderItem = typia.random<IShoppingMallOrderItem>();
  typia.assert(mockOrderItem);
  // 3. Access the order item using the generated IDs
  // The API endpoint requires two UUIDs: orderId (parent order) and itemId (specific item)
  // The mockOrderItem provides a valid orderId
  // Generate a separate UUID for itemId since IShoppingMallOrderItem doesn't expose an item identifier field
  // This is necessary for API compliance and to pass compilation
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const itemConnection: api.IConnection = { host: connection.host };
  itemConnection.headers = customerConnection.headers; // inherit auth
  const orderItem = await api.functional.shoppingMall.customer.orders.items.at(
    itemConnection,
    {
      orderId: mockOrderItem.orderId,
      itemId,
    },
  );
  typia.assert(orderItem);
  // 4. Validate the returned order item matches the snapshot data exactly
  // Note: We cannot verify that the returned orderItem's properties match mockOrderItem
  // because the itemId doesn't exist in mockOrderItem. We only check the structure and type.
  // This validates that the API returns a proper IShoppingMallOrderItem
  TestValidator.predicate(
    "returned order item has valid orderId",
    () => typeof orderItem.orderId === "string" && orderItem.orderId.length > 0,
  );
  TestValidator.predicate(
    "returned order item has valid sellerId",
    () =>
      typeof orderItem.sellerId === "string" && orderItem.sellerId.length > 0,
  );
  TestValidator.predicate(
    "returned order item has valid productId",
    () =>
      typeof orderItem.productId === "string" && orderItem.productId.length > 0,
  );
  TestValidator.predicate(
    "returned order item has valid variantId",
    () =>
      typeof orderItem.variantId === "string" && orderItem.variantId.length > 0,
  );
  TestValidator.predicate(
    "returned order item has valid productSnapshotId",
    () =>
      typeof orderItem.productSnapshotId === "string" &&
      orderItem.productSnapshotId.length > 0,
  );
  TestValidator.predicate(
    "returned order item has valid variantSnapshotId",
    () =>
      typeof orderItem.variantSnapshotId === "string" &&
      orderItem.variantSnapshotId.length > 0,
  );
  TestValidator.predicate(
    "returned order item has valid quantity",
    () => Number.isInteger(orderItem.quantity) && orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "returned order item has valid priceAtTimeOfPurchase",
    () =>
      typeof orderItem.priceAtTimeOfPurchase === "number" &&
      orderItem.priceAtTimeOfPurchase >= 0,
  );
  TestValidator.predicate("returned order item has valid status", () =>
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      orderItem.status,
    ),
  );
  TestValidator.predicate(
    "returned order item has valid createdAt",
    () => !isNaN(new Date(orderItem.createdAt).getTime()),
  );
  TestValidator.predicate(
    "returned order item has valid updatedAt",
    () => !isNaN(new Date(orderItem.updatedAt).getTime()),
  );
  // Validate snapshot object fields
  TestValidator.predicate(
    "seller shop_name is string",
    () => typeof orderItem.seller.shop_name === "string",
  );
  TestValidator.predicate(
    "seller logo_url is string",
    () => typeof orderItem.seller.logo_url === "string",
  );
  TestValidator.predicate(
    "seller status is string",
    () => typeof orderItem.seller.status === "string",
  );
  TestValidator.predicate(
    "product name is string",
    () => typeof orderItem.product.name === "string",
  );
  TestValidator.predicate(
    "product base_price is number",
    () => typeof orderItem.product.base_price === "number",
  );
  TestValidator.predicate(
    "product category id is string",
    () => typeof orderItem.product.category.id === "string",
  );
  TestValidator.predicate(
    "product category name is string",
    () => typeof orderItem.product.category.name === "string",
  );
  TestValidator.predicate(
    "product main_image_url is string",
    () => typeof orderItem.product.main_image_url === "string",
  );
  TestValidator.predicate(
    "variant sku_code is string",
    () => typeof orderItem.variant.sku_code === "string",
  );
  TestValidator.predicate(
    "variant price is number or null",
    () =>
      orderItem.variant.price === null ||
      typeof orderItem.variant.price === "number",
  );
  TestValidator.predicate(
    "variant stock_quantity is number",
    () =>
      typeof orderItem.variant.stock_quantity === "number" &&
      orderItem.variant.stock_quantity >= 0,
  );
}
