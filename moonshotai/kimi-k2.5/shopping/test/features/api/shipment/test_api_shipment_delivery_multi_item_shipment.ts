import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_customer_shipments_deliveries_create } from "../../../generate/generate_random_ecommerce_mall_customer_shipments_deliveries_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipment_delivery } from "../../../prepare/prepare_random_ecommerce_mall_shipment_delivery";

/**
 * Test delivery confirmation for a multi-item shipment containing products from the same seller.
 * Validates that all items in a shipment transition to 'delivered' status atomically.
 */
export async function test_api_shipment_delivery_multi_item_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up admin connection and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(category);
  // 2. Set up seller connection and create two products with variants
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Create first product
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: 10000,
      },
    },
  );
  typia.assert(product1);
  // Create first variant for product 1
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            },
          ],
          price: 10000,
          stock: 100,
        },
      },
    );
  typia.assert(variant1);
  // Create second product
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: 20000,
      },
    },
  );
  typia.assert(product2);
  // Create second variant for product 2
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          options: [
            {
              optionName: "Size",
              optionValue: "Large",
            },
          ],
          price: 20000,
          stock: 100,
        },
      },
    );
  typia.assert(variant2);
  // 3. Set up customer connection, add items to cart, and checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Add first variant to cart
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant1.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem1);
  // Add second variant to cart
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant2.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
  // Checkout to create order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: null,
        postalCode: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.name(),
      },
    },
  );
  typia.assert(order);
  TestValidator.equals("order has 2 items", order.orderItems.length, 2);
  // Verify initial order item statuses are 'paid'
  for (const item of order.orderItems) {
    TestValidator.equals("initial status is paid", item.status, "paid");
  }
  // 4. Seller creates shipment with both order items
  const orderItemIds = (
    order.orderItems as IEcommerceMallOrderItem.ISummary[]
  ).map((item) => item.id);
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: orderItemIds as [string, ...string[]],
        carrierName: "FedEx",
        trackingNumber: "TRACK123456",
      },
    },
  );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment has 2 items",
    shipment.shipmentItems.length,
    2,
  );
  // Verify shipment contains the correct order items
  const shipmentOrderItemIds = shipment.shipmentItems.map(
    (si) => si.orderItem.id,
  );
  TestValidator.equals(
    "shipment contains all order items",
    shipmentOrderItemIds.length,
    2,
  );
  for (const orderItemId of orderItemIds) {
    TestValidator.predicate(`shipment contains order item ${orderItemId}`, () =>
      shipmentOrderItemIds.includes(orderItemId),
    );
  }
  // 5. Customer confirms delivery using utility function
  const delivery =
    await generate_random_ecommerce_mall_customer_shipments_deliveries_create(
      customerConnection,
      {
        params: { shipmentId: shipment.id },
        body: {},
      },
    );
  typia.assert(delivery);
  // 6. Validations
  // Verify delivery record
  TestValidator.equals(
    "delivery belongs to correct shipment",
    delivery.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "delivery is not auto-delivered",
    delivery.isAutoDelivered,
    false,
  );
  TestValidator.predicate(
    "delivery has timestamp",
    () => delivery.deliveredAt !== null,
  );
  // Verify all shipment items have 'delivered' status - atomic transition
  // Use the shipment variable from step 4 to access shipmentItems
  for (const shipmentItem of shipment.shipmentItems) {
    TestValidator.equals(
      `order item ${shipmentItem.orderItem.id} status is delivered`,
      shipmentItem.orderItem.status,
      "delivered",
    );
  }
  // Verify snapshots are preserved in order items
  for (const shipmentItem of shipment.shipmentItems) {
    TestValidator.predicate(
      "product snapshot exists",
      () => shipmentItem.orderItem.product !== null,
    );
    TestValidator.predicate(
      "variant snapshot exists",
      () => shipmentItem.orderItem.variant !== null,
    );
    TestValidator.predicate(
      "seller snapshot exists",
      () => shipmentItem.orderItem.seller !== null,
    );
  }
  // Verify order status reflects delivered state
  TestValidator.equals(
    "order status is delivered",
    delivery.shipment.order.status,
    "delivered",
  );
}
