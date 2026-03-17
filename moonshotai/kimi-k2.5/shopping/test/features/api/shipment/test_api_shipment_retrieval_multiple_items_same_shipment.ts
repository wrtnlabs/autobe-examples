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

export async function test_api_shipment_retrieval_multiple_items_same_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Create category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(seller);
  // 4. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<100> & tags.Maximum<10000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Create first variant
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>(),
          options: [
            { optionName: "Color", optionValue: "Red" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        },
      },
    );
  typia.assert(variant1);
  // 6. Create second variant
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>(),
          options: [
            { optionName: "Color", optionValue: "Blue" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        },
      },
    );
  typia.assert(variant2);
  // 7. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer);
  // 8. Add first variant to cart
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant1.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem1);
  // 9. Add second variant to cart
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant2.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem2);
  // 10. Checkout creates order with multiple items
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(order);
  typia.assert(order.orderItems.length >= 2);
  // Extract order item IDs for the two variants
  // Cast to ISummary since order.orderItems actually returns IEcommerceMallOrderItem.ISummary[]
  const orderItems = order.orderItems as IEcommerceMallOrderItem.ISummary[];
  const orderItemIds = orderItems
    .filter(
      (item) =>
        item.variant.id === variant1.id || item.variant.id === variant2.id,
    )
    .map((item) => item.id);
  typia.assert(orderItemIds.length === 2);
  // 11. Create shipment containing both order items
  const carrierName = "FedEx";
  const trackingNumber = RandomGenerator.alphaNumeric(12).toUpperCase();
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds,
        carrierName,
        trackingNumber,
      },
    },
  );
  typia.assert(shipment);
  // 12. Retrieve the shipment and validate
  const retrievedShipment =
    await api.functional.ecommerceMall.seller.shipments.at(sellerConnection, {
      shipmentId: shipment.id,
    });
  typia.assert(retrievedShipment);
  // 13. Validate shipment contents
  TestValidator.equals(
    "shipment item count",
    retrievedShipment.shipmentItems.length,
    2,
  );
  TestValidator.equals(
    "carrier name",
    retrievedShipment.carrierName,
    carrierName,
  );
  TestValidator.equals(
    "tracking number",
    retrievedShipment.trackingNumber,
    trackingNumber,
  );
  TestValidator.equals("delivery is null", retrievedShipment.delivery, null);
  // Verify both order items are present
  const retrievedOrderItemIds = retrievedShipment.shipmentItems.map(
    (item) => item.orderItem.id,
  );
  TestValidator.predicate("all order items present", () =>
    orderItemIds.every((id) => retrievedOrderItemIds.includes(id)),
  );
  // Verify order items have product and variant information
  TestValidator.predicate("order items have product info", () =>
    retrievedShipment.shipmentItems.every(
      (item) =>
        item.orderItem.product !== null &&
        item.orderItem.product.id === product.id,
    ),
  );
  TestValidator.predicate("order items have variant info", () =>
    retrievedShipment.shipmentItems.every(
      (item) => item.orderItem.variant !== null,
    ),
  );
  // Verify both items share same carrier and tracking
  TestValidator.predicate("all items share same carrier", () =>
    retrievedShipment.shipmentItems.every(
      (item) => retrievedShipment.carrierName === carrierName,
    ),
  );
  TestValidator.predicate("all items share same tracking", () =>
    retrievedShipment.shipmentItems.every(
      (item) => retrievedShipment.trackingNumber === trackingNumber,
    ),
  );
}
