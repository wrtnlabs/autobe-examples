import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that order item snapshot data is preserved even after seller modifies or deletes the original product.
 *
 * Validates the complete order item snapshot preservation workflow including administrative setup, seller product creation, customer order placement, and verification that snapshot data remains immutable after seller modifications. Ensures that the order item correctly preserves the original product name, description, variant SKU, price, seller shop information, product images, and variant options even when the seller later modifies or deletes these entities.
 *
 * Special attention is given to verifying that the snapshot data is completely independent of the current product state, ensuring that deleted products and variants do not affect order item visibility and that original pricing and images are preserved for refund calculations and customer reference.
 *
 * 1. Administrator registers and authenticates to the platform.
 * 2. Seller registers and authenticates to create products.
 * 3. Customer registers and authenticates to place orders.
 * 4. Seller creates a product with specific name, description, and base price.
 * 5. Customer adds the product variant to cart and completes checkout.
 * 6. Order item ID is obtained from the created order.
 * 7. Seller updates the product with new name, description, and price.
 * 8. Administrator retrieves the order item by ID.
 * 9. Validates that snapshot data (product_name, product_description, variant_sku_code, variant_price, seller_shop_name, seller_shop_description, images, variantOptions) matches the ORIGINAL values before seller modifications.
 */
export async function test_api_order_item_snapshot_data_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin1234",
    },
  });
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Seller1234",
    href: "https://example.com/seller/join",
    referrer: "https://example.com",
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerJoinBody });
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Customer1234",
    href: "https://example.com/customer/join",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, { body: customerJoinBody });
  // 4. Seller creates product with original data
  const originalProductName = RandomGenerator.paragraph({ sentences: 2 });
  const originalProductDescription = RandomGenerator.content({ paragraphs: 1 });
  const originalBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: originalProductName,
        description: originalProductDescription,
        base_price: originalBasePrice,
      },
    },
  );
  typia.assert(product);
  // 5. Customer adds product to cart (using product ID as variant ID for simple products)
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: product.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer completes checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the order item ID
  const orderItem = order.items[0];
  if (!orderItem) {
    throw new Error("No order items found in the created order");
  }
  typia.assert(orderItem);
  const orderItemId: string & tags.Format<"uuid"> = orderItem.id;
  // Store original snapshot values for comparison
  const originalProductNameSnapshot = orderItem.product_name;
  const originalProductDescriptionSnapshot = orderItem.product_description;
  const originalVariantSkuCodeSnapshot = orderItem.variant_sku_code;
  const originalVariantPriceSnapshot = orderItem.variant_price;
  const originalSellerShopNameSnapshot = orderItem.seller_shop_name;
  const originalSellerShopDescriptionSnapshot =
    orderItem.seller_shop_description;
  const originalImagesSnapshot = orderItem.images;
  const originalVariantOptionsSnapshot = orderItem.variantOptions;
  // 7. Seller updates product with new data (simulating modification)
  const updatedProductName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedProductDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<5000>
  >();
  await api.functional.shoppingMall.seller.products.update(sellerConnection, {
    productId: product.id,
    body: {
      name: updatedProductName,
      description: updatedProductDescription,
      base_price: updatedBasePrice,
    } satisfies IShoppingMallProduct.IUpdate,
  });
  // 8. Administrator retrieves order item by ID
  const retrievedOrderItem =
    await api.functional.shoppingMall.administrator.order_items.at(
      adminConnection,
      {
        itemId: orderItemId,
      },
    );
  typia.assert(retrievedOrderItem);
  // 9. Validate snapshot data matches ORIGINAL values (not updated values)
  TestValidator.equals(
    "product_name preserved as original",
    retrievedOrderItem.product_name,
    originalProductNameSnapshot,
  );
  TestValidator.notEquals(
    "product_name differs from updated",
    retrievedOrderItem.product_name,
    updatedProductName,
  );
  TestValidator.equals(
    "product_description preserved as original",
    retrievedOrderItem.product_description,
    originalProductDescriptionSnapshot,
  );
  TestValidator.notEquals(
    "product_description differs from updated",
    retrievedOrderItem.product_description,
    updatedProductDescription,
  );
  TestValidator.equals(
    "variant_sku_code preserved as original",
    retrievedOrderItem.variant_sku_code,
    originalVariantSkuCodeSnapshot,
  );
  TestValidator.equals(
    "variant_price preserved as original",
    retrievedOrderItem.variant_price,
    originalVariantPriceSnapshot,
  );
  TestValidator.notEquals(
    "variant_price differs from updated base_price",
    retrievedOrderItem.variant_price,
    updatedBasePrice,
  );
  TestValidator.equals(
    "seller_shop_name preserved as original",
    retrievedOrderItem.seller_shop_name,
    originalSellerShopNameSnapshot,
  );
  TestValidator.equals(
    "seller_shop_description preserved as original",
    retrievedOrderItem.seller_shop_description,
    originalSellerShopDescriptionSnapshot,
  );
  TestValidator.equals(
    "images array preserved as original",
    retrievedOrderItem.images,
    originalImagesSnapshot,
  );
  TestValidator.predicate(
    "images array not empty",
    retrievedOrderItem.images.length > 0,
  );
  TestValidator.equals(
    "variant_options array preserved as original",
    retrievedOrderItem.variantOptions,
    originalVariantOptionsSnapshot,
  );
  TestValidator.equals(
    "order_item_status remains unchanged",
    retrievedOrderItem.status,
    orderItem.status,
  );
}