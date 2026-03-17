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

export async function test_api_seller_order_with_shipment_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Setup seller and create product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
    },
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<number & tags.Minimum<1>>(),
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick([
                "Red",
                "Blue",
                "Black",
                "White",
              ]),
            },
          ],
          price: typia.random<number & tags.Minimum<1>>() satisfies number as number,
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>(),
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 3. Setup customer and create order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
    },
  );
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: typia.random<string | null>(),
        postalCode: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.pick(["US", "KR", "JP", "CN", "DE", "UK"]),
      },
    },
  );
  typia.assert(order);
  // Store order item ID for shipment creation
  const orderItem = order.orderItems[0]!;
  typia.assertGuard<IEcommerceMallOrderItem & IEntity>(orderItem);
  const orderItemId = orderItem.id;
  // 4. Seller creates shipment for order items
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItemId],
        carrierName: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        trackingNumber: RandomGenerator.alphaNumeric(20),
      },
    },
  );
  typia.assert(shipment);
  typia.assertGuard<IEcommerceMallShipment>(shipment);
  // 5. Confirm delivery of shipment
  const deliverySummary =
    await api.functional.ecommerceMall.seller.shipments.deliveries.confirmDelivery(
      sellerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(deliverySummary);
  // 6. Seller retrieves order with shipment details
  const retrievedOrder = await api.functional.ecommerceMall.seller.orders.at(
    sellerConnection,
    { orderId: order.id },
  );
  typia.assert(retrievedOrder);
  typia.assertGuard<IEcommerceMallOrder>(retrievedOrder);
  // 7. Validate shipment and tracking information
  TestValidator.predicate(
    "order has shipments",
    () => retrievedOrder.shipments.length > 0,
  );
  const retrievedShipment = retrievedOrder.shipments[0]!;
  typia.assertGuard<IEcommerceMallShipment>(retrievedShipment);
  // Validate shipment details
  TestValidator.equals(
    "shipment carrier name",
    retrievedShipment.carrierName,
    shipment.carrierName,
  );
  TestValidator.equals(
    "shipment tracking number",
    retrievedShipment.trackingNumber,
    shipment.trackingNumber,
  );
  TestValidator.predicate(
    "shipment has shipped timestamp",
    () => retrievedShipment.shippedAt !== null,
  );
  // Validate shipment items link to correct order items
  typia.assertGuard<IEcommerceMallShipmentItem[]>(
    retrievedShipment.shipmentItems,
  );
  TestValidator.predicate(
    "shipment has items",
    () => retrievedShipment.shipmentItems.length > 0,
  );
  const shipmentItem = retrievedShipment.shipmentItems[0]!;
  typia.assertGuard<IEcommerceMallShipmentItem>(shipmentItem);
  TestValidator.equals(
    "shipment item references correct order item",
    shipmentItem.orderItemId,
    orderItemId,
  );
  // Validate delivery confirmation
  typia.assertGuard<IEcommerceMallShipmentDelivery | null>(
    retrievedShipment.delivery,
  );
  TestValidator.predicate(
    "shipment has delivery confirmation",
    () => retrievedShipment.delivery !== null,
  );
  const deliveryConfirmation = retrievedShipment.delivery!;
  typia.assertGuard<IEcommerceMallShipmentDelivery>(deliveryConfirmation);
  TestValidator.predicate(
    "delivery has timestamp",
    () => deliveryConfirmation.deliveredAt !== null,
  );
  TestValidator.equals(
    "delivery is auto-delivered",
    deliveryConfirmation.isAutoDelivered,
    true,
  );
  // Validate order item status progression
  const updatedOrderItem = retrievedOrder.orderItems[0]!;
  typia.assert(updatedOrderItem);
  TestValidator.equals(
    "order item status is delivered",
    updatedOrderItem.status,
    "delivered",
  );
  // Validate shipper information is present
  TestValidator.predicate(
    "shipment includes seller summary",
    () => retrievedShipment.seller !== null,
  );
  TestValidator.predicate(
    "shipment includes order summary",
    () => retrievedShipment.order !== null,
  );
  TestValidator.equals(
    "shipment order ID matches",
    retrievedShipment.order.id,
    order.id,
  );
}