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
 * Test that order item snapshots preserve product state even after product modifications.
 *
 * Validates that when a seller modifies their product name, description, or price after a customer has already purchased it, the order item snapshot still shows the original purchase-time data. This ensures order history accuracy for dispute resolution and customer reference.
 *
 * The test follows the complete order lifecycle: seller and customer registration, product creation, order placement through checkout, product modification by seller, and finally verification that the immutable snapshot fields in the order item retain the original values from the time of purchase.
 *
 * 1. Seller and customer authenticate via join operations
 * 2. Seller creates a product with initial name, description, and base_price
 * 3. Customer completes checkout to create an order
 * 4. Seller updates the product with new name, description, and base_price
 * 5. Seller retrieves the order item via GET /shoppingMall/seller/orders/{orderId}/items/{itemId}
 * 6. Validates that snapshot fields contain original values from purchase time
 */
export async function test_api_order_item_snapshot_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Seller creates product with initial values
  const originalProductName = RandomGenerator.paragraph({ sentences: 2 });
  const originalProductDescription = RandomGenerator.content({ paragraphs: 1 });
  const originalBasePrice: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: originalProductName,
        description: originalProductDescription,
        base_price: originalBasePrice,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Customer checkout to create order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the first order item
  if (order.items.length === 0) {
    throw new Error("Order has no items");
  }
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // Store original snapshot values from order item
  const snapshotProductName = orderItem.product_name;
  const snapshotProductDescription = orderItem.product_description;
  const snapshotVariantPrice = orderItem.variant_price;
  const snapshotSellerShopName = orderItem.seller_shop_name;
  // 5. Seller modifies the product
  const modifiedProductName = RandomGenerator.paragraph({ sentences: 3 });
  const modifiedProductDescription = RandomGenerator.content({ paragraphs: 2 });
  const modifiedBasePrice: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<5000>
  >();
  await api.functional.shoppingMall.seller.products.update(sellerConnection, {
    productId: product.id,
    body: {
      name: modifiedProductName,
      description: modifiedProductDescription,
      base_price: modifiedBasePrice,
    } satisfies IShoppingMallProduct.IUpdate,
  });
  // 6. Seller retrieves the order item again
  const retrievedOrderItem =
    await api.functional.shoppingMall.seller.orders.items.at(sellerConnection, {
      orderId: order.id,
      itemId: orderItem.id,
    });
  typia.assert(retrievedOrderItem);
  // 7. Validate snapshot fields are preserved (immutable)
  TestValidator.equals(
    "product_name snapshot preserved after modification",
    retrievedOrderItem.product_name,
    snapshotProductName,
  );
  TestValidator.equals(
    "product_description snapshot preserved after modification",
    retrievedOrderItem.product_description,
    snapshotProductDescription,
  );
  TestValidator.equals(
    "variant_price snapshot preserved after modification",
    retrievedOrderItem.variant_price,
    snapshotVariantPrice,
  );
  TestValidator.equals(
    "seller_shop_name snapshot preserved after modification",
    retrievedOrderItem.seller_shop_name,
    snapshotSellerShopName,
  );
  // Verify snapshots differ from modified product values (if this is our product)
  if (retrievedOrderItem.productVariant.product.id === product.id) {
    TestValidator.notEquals(
      "product_name differs from modified product",
      retrievedOrderItem.product_name,
      modifiedProductName,
    );
    TestValidator.notEquals(
      "product_description differs from modified product",
      retrievedOrderItem.product_description,
      modifiedProductDescription,
    );
  }
  // Validate snapshot integrity - all fields should exist and be non-empty
  TestValidator.predicate(
    "product_name snapshot is non-empty",
    retrievedOrderItem.product_name.length > 0,
  );
  TestValidator.predicate(
    "product_description snapshot is non-empty",
    retrievedOrderItem.product_description.length > 0,
  );
  TestValidator.predicate(
    "variant_price snapshot is positive",
    retrievedOrderItem.variant_price > 0,
  );
  TestValidator.predicate(
    "seller_shop_name snapshot is non-empty",
    retrievedOrderItem.seller_shop_name.length > 0,
  );
  TestValidator.predicate(
    "variant_sku_code snapshot exists",
    retrievedOrderItem.variant_sku_code.length > 0,
  );
}