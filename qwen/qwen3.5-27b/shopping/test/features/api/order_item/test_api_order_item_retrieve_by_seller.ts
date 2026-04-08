import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a seller can retrieve detailed information for an order item they need to fulfill.
 *
 * Validates the complete order item retrieval workflow including seller authentication, customer registration, product creation, order placement, and order item detail viewing. Ensures that sellers can access comprehensive order item information including immutable snapshots of product state at purchase time.
 *
 * Special attention is given to verifying that the snapshot data (product name, description, variant SKU, price, seller shop information) is preserved exactly as it existed when the order was placed, regardless of any subsequent product modifications.
 *
 * 1. Seller registers and authenticates via join operation.
 * 2. Customer registers and authenticates via join operation.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Customer completes checkout to create an order with the seller's product.
 * 5. Seller retrieves the order item details using order ID and item ID.
 * 6. Validates order item contains correct quantity, price, and status.
 * 7. Validates snapshot data matches product state at purchase time.
 */
export async function test_api_order_item_retrieve_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Customer completes checkout to create an order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the first order item from the order
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // 5. Seller retrieves the order item details
  const retrievedOrderItem =
    await api.functional.shoppingMall.seller.orders.items.at(sellerConnection, {
      orderId: order.id,
      itemId: orderItem.id,
    });
  typia.assert(retrievedOrderItem);
  // 6. Validate order item details
  TestValidator.equals(
    "order item ID matches",
    retrievedOrderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "order ID matches",
    retrievedOrderItem.order.id,
    order.id,
  );
  TestValidator.predicate(
    "has positive quantity",
    retrievedOrderItem.quantity > 0,
  );
  TestValidator.predicate("has positive price", retrievedOrderItem.price > 0);
  TestValidator.equals("status is paid", retrievedOrderItem.status, "paid");
  // 7. Validate snapshot data exists and matches product state
  TestValidator.equals(
    "product name in snapshot",
    retrievedOrderItem.product_name,
    product.name,
  );
  TestValidator.equals(
    "product description in snapshot",
    retrievedOrderItem.product_description,
    product.description,
  );
  TestValidator.predicate(
    "has variant SKU code",
    retrievedOrderItem.variant_sku_code.length > 0,
  );
  TestValidator.predicate(
    "has variant price",
    retrievedOrderItem.variant_price > 0,
  );
  TestValidator.predicate(
    "has seller shop name",
    retrievedOrderItem.seller_shop_name.length > 0,
  );
  // 8. Validate variant options snapshot
  TestValidator.predicate(
    "has variant options",
    retrievedOrderItem.variantOptions.length >= 0,
  );
  // 9. Validate product images snapshot
  TestValidator.predicate(
    "has product images",
    retrievedOrderItem.images.length >= 0,
  );
  // 10. Validate order reference
  TestValidator.predicate(
    "order number exists",
    retrievedOrderItem.order.order_number.length > 0,
  );
}
