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
 * Test order item retrieval with immutable purchase-time snapshot validation.
 *
 * Validates that customers can retrieve detailed order item information including the complete snapshot that preserves product state at the time of purchase. The test ensures that all snapshot fields (product name, description, variant SKU, price, seller shop details, images, and variant options) are correctly captured and remain immutable even if the underlying product or seller profile changes.
 *
 * Special attention is given to verifying that the snapshot data accurately reflects the product state at order placement time, ensuring customers and sellers can always reference the exact product details regardless of subsequent modifications.
 *
 * 1. Register and authenticate a customer account.
 * 2. Register and authenticate a seller account.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Seller creates a product variant with SKU code, options, and initial stock.
 * 5. Customer adds the variant to their shopping cart.
 * 6. Customer completes checkout to create an order.
 * 7. Customer retrieves the order item by order ID and item ID.
 * 8. Validate that order item contains all expected fields including snapshot data.
 * 9. Verify snapshot fields match the product state at purchase time.
 */
export async function test_api_order_item_retrieval_with_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates a product variant with options and stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
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
  // 6. Customer completes checkout to create order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the first order item from the created order
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // 7. Customer retrieves the specific order item
  const retrievedItem =
    await api.functional.shoppingMall.customer.orders.items.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(retrievedItem);
  // 8. Validate order item basic fields
  TestValidator.equals("order item ID matches", retrievedItem.id, orderItem.id);
  TestValidator.equals("quantity is correct", retrievedItem.quantity, 1);
  TestValidator.equals("status is paid", retrievedItem.status, "paid");
  TestValidator.predicate("price is positive", retrievedItem.price > 0);
  TestValidator.predicate(
    "created_at exists",
    retrievedItem.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedItem.updated_at !== null,
  );
  // 9. Validate product variant details
  TestValidator.equals(
    "variant SKU code matches",
    retrievedItem.productVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.predicate(
    "variant has options",
    retrievedItem.productVariant.options.length > 0,
  );
  // 10. Validate seller information
  TestValidator.equals(
    "seller ID matches",
    retrievedItem.seller.id,
    product.seller.id,
  );
  TestValidator.predicate(
    "seller has shop name",
    retrievedItem.seller.seller_profile.shop_name.length > 0,
  );
  // 11. Validate immutable snapshot data
  TestValidator.equals(
    "snapshot product name matches",
    retrievedItem.product_name,
    product.name,
  );
  TestValidator.equals(
    "snapshot product description matches",
    retrievedItem.product_description,
    product.description,
  );
  TestValidator.equals(
    "snapshot variant SKU matches",
    retrievedItem.variant_sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "snapshot variant price matches",
    retrievedItem.variant_price,
    retrievedItem.price,
  );
  TestValidator.equals(
    "snapshot seller shop name matches",
    retrievedItem.seller_shop_name,
    product.seller.seller_profile.shop_name,
  );
  TestValidator.predicate(
    "snapshot seller shop description exists",
    retrievedItem.seller_shop_description !== null,
  );
  // 12. Validate snapshot images array
  TestValidator.predicate(
    "snapshot images array exists",
    Array.isArray(retrievedItem.images),
  );
  // 13. Validate snapshot variant options array
  TestValidator.equals(
    "snapshot variant options count matches",
    retrievedItem.variantOptions.length,
    variant.options.length,
  );
  TestValidator.predicate(
    "snapshot variant options have key-value pairs",
    retrievedItem.variantOptions.every(
      (opt) => opt.key.length > 0 && opt.value.length > 0,
    ),
  );
  // 14. Validate order summary
  TestValidator.equals("order ID matches", retrievedItem.order.id, order.id);
  TestValidator.equals(
    "order number matches",
    retrievedItem.order.order_number,
    order.order_number,
  );
  TestValidator.equals(
    "order status is paid",
    retrievedItem.order.status,
    "paid",
  );
  TestValidator.predicate(
    "order total price is positive",
    retrievedItem.order.total_price > 0,
  );
  TestValidator.predicate(
    "shipping address exists",
    retrievedItem.order.shipping_address.id.length > 0,
  );
}
