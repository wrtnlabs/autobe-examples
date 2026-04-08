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
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test the business workflow where a seller bundles multiple order items from the same order into a single shipment package.
 *
 * This test validates the complete multi-item shipment creation flow including seller and customer authentication, product creation with variants, order placement with multiple items, and shipment bundling. Ensures that when a seller creates a shipment with multiple order items, the shipment is created successfully with all items bundled together.
 *
 * Special attention is given to verifying that the shipment correctly references all order items and the order, and that the carrier information is properly stored.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Customer registers and authenticates to the platform.
 * 3. Seller creates three products with variants and initial stock.
 * 4. Customer adds all three variants to cart and completes checkout.
 * 5. Seller creates a shipment bundling all three order items.
 * 6. Validates shipment contains correct order reference and carrier details.
 */
export async function test_api_shipment_multi_item_bundling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: undefined,
  });
  typia.assert(sellerAuth);
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: undefined,
  });
  typia.assert(customerAuth);
  // 3. Seller creates three products with variants
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(product1);
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: { initialStockQuantity: 10 },
      },
    );
  typia.assert(variant1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(product2);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: { initialStockQuantity: 10 },
      },
    );
  typia.assert(variant2);
  const product3 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(product3);
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product3.id },
        body: { initialStockQuantity: 10 },
      },
    );
  typia.assert(variant3);
  // 4. Customer adds all three variants to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant1.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant2.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
  const cartItem3 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant3.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem3);
  // 5. Customer completes checkout to create order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    { body: undefined },
  );
  typia.assert(order);
  // Verify order contains exactly 3 items
  TestValidator.equals("order item count", order.items.length, 3);
  // Verify all items belong to the same seller
  const sellerId = sellerAuth.id;
  const allItemsFromSameSeller = order.items.every(
    (item) => item.seller.id === sellerId,
  );
  TestValidator.predicate("all items from same seller", allItemsFromSameSeller);
  // Extract order item IDs for shipment
  const orderItemIds = order.items.map((item) => item.id);
  // 6. Seller creates shipment with all three order items
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrier_name: "UPS",
        tracking_number: "1Z999AA10123456784",
        order_item_ids: orderItemIds,
        order_id: order.id,
      },
    },
  );
  typia.assert(shipment);
  // 7. Validate shipment details
  TestValidator.equals("carrier name", shipment.carrier_name, "UPS");
  TestValidator.equals(
    "tracking number",
    shipment.tracking_number,
    "1Z999AA10123456784",
  );
  TestValidator.equals("order ID", shipment.order.id, order.id);
  // 8. Validate shipment belongs to the authenticated seller
  TestValidator.equals("seller ID", shipment.seller.id, sellerId);
}
