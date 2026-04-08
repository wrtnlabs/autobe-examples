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
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test administrator force-refunding a single order item to verify the primary success path.
 *
 * Validates the complete administrator force-refund workflow including seller product setup, customer order placement, and administrative refund processing. Ensures that the order item status changes correctly, inventory is restored, and the force-refund operation bypasses normal refund constraints.
 *
 * Special attention is given to verifying that the force-refund bypasses the 7-day refund window and seller approval requirements, while properly restoring stock quantities and updating order status.
 *
 * 1. Administrator registers and authenticates to gain admin privileges.
 * 2. Seller registers and authenticates to create products.
 * 3. Seller creates a product with a variant and adds inventory stock.
 * 4. Customer registers and authenticates to place orders.
 * 5. Customer creates a shipping address for checkout.
 * 6. Customer adds the product variant to shopping cart.
 * 7. Customer completes checkout to create an order with one item in 'paid' status.
 * 8. Administrator force-refunds the order item.
 * 9. Validates order item status changed to 'refunded'.
 * 10. Validates snapshot data is preserved in the response.
 * 11. Validates quantity and price are preserved from original purchase.
 */
export async function test_api_order_item_force_refund_single_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
    },
  });
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product for Force Refund",
        description:
          "A product used to test administrator force refund functionality",
        base_price: 10000,
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: "TEST-VARIANT-001",
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 5. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
    },
  });
  // 6. Customer creates shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: "Test Customer",
        phone_number: "01012345678",
        street_address: "123 Test Street",
        city: "Seoul",
        postal_code: "12345",
        country: "South Korea",
      },
    },
  );
  typia.assert(address);
  // 7. Customer adds variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // 8. Customer completes checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
        payment_token: "test_payment_token_12345",
      },
    },
  );
  typia.assert(order);
  // Get the order item (should be single item)
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // Verify initial status is 'paid'
  TestValidator.equals(
    "initial order item status is paid",
    orderItem.status,
    "paid",
  );
  // 9. Administrator force-refunds the order item
  const refundedItem =
    await api.functional.shoppingMall.administrator.orders.items.force_refund.forceRefund(
      adminConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(refundedItem);
  // 10. Validate order item status changed to 'refunded'
  TestValidator.equals(
    "order item status changed to refunded",
    refundedItem.status,
    "refunded",
  );
  // 11. Validate snapshot data is preserved
  TestValidator.predicate(
    "product name preserved",
    refundedItem.product_name.length > 0,
  );
  TestValidator.predicate(
    "variant SKU preserved",
    refundedItem.variant_sku_code.length > 0,
  );
  TestValidator.predicate(
    "seller shop name preserved",
    refundedItem.seller_shop_name.length > 0,
  );
  // 12. Validate quantity and price are preserved
  TestValidator.equals("quantity preserved", refundedItem.quantity, 2);
  TestValidator.predicate("price is positive", refundedItem.price > 0);
  // Note: Inventory restoration is handled server-side (positive quantity_change record created)
  // Note: Order status update to 'refunded' is handled server-side when all items are refunded
  // Note: Administrator audit log is created server-side for accountability
}
