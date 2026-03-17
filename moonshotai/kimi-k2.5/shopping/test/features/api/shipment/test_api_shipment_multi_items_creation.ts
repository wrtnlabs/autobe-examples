import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test creating a shipment containing multiple paid order items from the same seller.
 *
 * **Business Context**: When a customer places an order with multiple items from the same seller,
 * the seller should be able to bundle these items into a single shipment package for efficient shipping.
 *
 * **Test Steps**:
 * 1. Authenticate as admin and create a product category
 * 2. Authenticate as seller and create a product with at least one variant and inventory
 * 3. Authenticate as customer, add the variant to cart, and complete checkout to create an order with 'paid' order items
 * 4. As the seller, create a shipment containing multiple order items by calling POST /ecommerceMall/seller/shipments
 *
 * **Expected Results**:
 * - Shipment is created successfully with 201 status
 * - Response includes shipment ID, carrierName, trackingNumber, shippedAt timestamp
 * - All included order items' status changes from 'paid' to 'shipped'
 * - ShipmentItems junction records link the shipment to each order item
 * - Order status updates to 'shipped'
 */
export async function test_api_shipment_multi_items_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: null,
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    { body: { parentId: null } },
  );
  typia.assert(category);
  // 2. Seller setup - create product with variant and inventory
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(sellerAuth);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: category.id,
        basePrice: 10000,
        images: [],
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphabets(8).toUpperCase(),
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ],
          price: null,
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // Add inventory for the variant
  await generate_random_ecommerce_mall_seller_variants_inventory_create(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity: 100,
        reason: "Initial stock",
      },
    },
  );
  // 3. Customer setup - add to cart and checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerAuth);
  // Add variant to cart with quantity
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // Create order via checkout
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: RandomGenerator.alphaNumeric(6),
        country: "USA",
      },
    },
  );
  typia.assert(order);
  // Get the paid order items - these must be shipped items
  const paidOrderItems = order.orderItems.filter(
    (item) => item.status === "paid",
  );
  TestValidator.predicate(
    "should have at least one paid order item",
    paidOrderItems.length >= 1,
  );
  const orderItemIds = paidOrderItems.map((item) => typia.assert<IEntity>(item as any).id);
  // 4. Seller creates shipment with the paid order items
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: orderItemIds,
        carrierName: "FedEx",
        trackingNumber: RandomGenerator.alphaNumeric(12).toUpperCase(),
      },
    },
  );
  typia.assert(shipment);
  // Validation: Verify shipment structure
  TestValidator.predicate(
    "shipment has carrier name",
    shipment.carrierName === "FedEx",
  );
  TestValidator.predicate(
    "shipment has tracking number",
    shipment.trackingNumber.length > 0,
  );
  TestValidator.predicate(
    "shipment has shipped timestamp",
    typia.is<string>(shipment.shippedAt),
  );
  // Validation: Verify shipment items
  TestValidator.predicate(
    "shipment has correct number of items",
    shipment.shipmentItems.length === orderItemIds.length,
  );
  // Validation: Verify all order items are linked to the shipment
  const shipmentOrderItemIds = shipment.shipmentItems.map(
    (si) => si.orderItemId,
  );
  TestValidator.predicate(
    "all order items are in shipment",
    orderItemIds.every((id) => shipmentOrderItemIds.includes(id)),
  );
  // Validation: Verify seller information matches
  TestValidator.equals("seller ID matches", shipment.seller.id, sellerAuth.id);
  // Validation: Verify order reference matches
  TestValidator.equals("order ID matches", shipment.order.id, order.id);
}