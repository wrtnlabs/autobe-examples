import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test order item snapshot preservation after product and variant updates.
 *
 * Validates that order item snapshot data remains immutable even after the seller modifies the product and variant. The test creates a product and variant, purchases it as a customer, then updates both the product and variant with new values. Finally, it retrieves the order item and verifies that all snapshot fields contain the original purchase-time values, not the updated values.
 *
 * This ensures that customers and sellers can always reference the exact product state and pricing at the time of purchase, regardless of subsequent modifications. The snapshot data is completely independent of the current product state.
 *
 * 1. Register and authenticate a customer
 * 2. Register and authenticate a seller
 * 3. Seller creates a product with specific name, description, and base price
 * 4. Seller creates a variant with specific SKU code, options, and price
 * 5. Customer adds the variant to cart and completes checkout to create an order
 * 6. Seller updates the product (name, description, base price)
 * 7. Seller updates the variant (SKU code, price, options)
 * 8. Customer retrieves the order item and validates snapshot fields contain original values
 * 9. Verify snapshot data is independent of current product state
 */
export async function test_api_order_item_snapshot_preservation_after_product_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 3. Seller creates a product with specific name, description, and base price
  const originalProductName = RandomGenerator.name(3);
  const originalProductDescription = RandomGenerator.paragraph({
    sentences: 3,
  });
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
  // 4. Seller creates a variant with specific SKU code, options, and price
  const originalSkuCode = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const originalVariantPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<500>
  >();
  const originalOptions: IShoppingMallProductVariantOption[] = [
    { key: "color", value: "Red" },
    { key: "size", value: "Large" },
  ];
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: originalSkuCode,
          price: originalVariantPrice,
          variantOptions: originalOptions,
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer completes checkout to create an order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the order item from the order
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // Store original snapshot values before updates
  const originalSnapshotProductName = orderItem.product_name;
  const originalSnapshotProductDescription = orderItem.product_description;
  const originalSnapshotSkuCode = orderItem.variant_sku_code;
  const originalSnapshotVariantPrice = orderItem.variant_price;
  const originalSnapshotSellerShopName = orderItem.seller_shop_name;
  const originalSnapshotSellerShopDescription =
    orderItem.seller_shop_description;
  // 7. Seller updates the product with new values
  const updatedProductName = RandomGenerator.name(3);
  const updatedProductDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2000>
  >();
  await api.functional.shoppingMall.seller.products.update(sellerConnection, {
    productId: product.id,
    body: {
      name: updatedProductName,
      description: updatedProductDescription,
      base_price: updatedBasePrice,
    } satisfies IShoppingMallProduct.IUpdate,
  });
  // 8. Seller updates the variant with new values
  const updatedSkuCode = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const updatedVariantPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1500>
  >();
  const updatedOptions: IShoppingMallProductVariantOption[] = [
    { key: "color", value: "Blue" },
    { key: "size", value: "Small" },
    { key: "material", value: "Cotton" },
  ];
  await api.functional.shoppingMall.seller.products.variants.update(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      body: {
        sku_code: updatedSkuCode,
        price: updatedVariantPrice,
        variantOptions: updatedOptions,
      } satisfies IShoppingMallProductVariant.IUpdate,
    },
  );
  // 9. Customer retrieves the order item to validate snapshot preservation
  const retrievedOrderItem =
    await api.functional.shoppingMall.customer.orders.items.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(retrievedOrderItem);
  // 10. Validate snapshot fields contain original values (not updated)
  TestValidator.equals(
    "snapshot product_name matches original",
    retrievedOrderItem.product_name,
    originalSnapshotProductName,
  );
  TestValidator.equals(
    "snapshot product_description matches original",
    retrievedOrderItem.product_description,
    originalSnapshotProductDescription,
  );
  TestValidator.equals(
    "snapshot variant_sku_code matches original",
    retrievedOrderItem.variant_sku_code,
    originalSnapshotSkuCode,
  );
  TestValidator.equals(
    "snapshot variant_price matches original",
    retrievedOrderItem.variant_price,
    originalSnapshotVariantPrice,
  );
  TestValidator.equals(
    "snapshot seller_shop_name matches original",
    retrievedOrderItem.seller_shop_name,
    originalSnapshotSellerShopName,
  );
  TestValidator.equals(
    "snapshot seller_shop_description matches original",
    retrievedOrderItem.seller_shop_description,
    originalSnapshotSellerShopDescription,
  );
  // 11. Verify snapshot values are different from updated values
  TestValidator.notEquals(
    "snapshot product_name differs from updated",
    retrievedOrderItem.product_name,
    updatedProductName,
  );
  TestValidator.notEquals(
    "snapshot product_description differs from updated",
    retrievedOrderItem.product_description,
    updatedProductDescription,
  );
  TestValidator.notEquals(
    "snapshot variant_sku_code differs from updated",
    retrievedOrderItem.variant_sku_code,
    updatedSkuCode,
  );
  TestValidator.notEquals(
    "snapshot variant_price differs from updated",
    retrievedOrderItem.variant_price,
    updatedVariantPrice,
  );
  // 12. Verify current productVariant relation shows updated data
  TestValidator.equals(
    "current variant sku_code shows updated value",
    retrievedOrderItem.productVariant.sku_code,
    updatedSkuCode,
  );
}
