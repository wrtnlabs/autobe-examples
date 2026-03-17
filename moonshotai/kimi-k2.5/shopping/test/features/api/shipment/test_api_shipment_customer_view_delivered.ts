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
 * Test customer viewing a delivered shipment to verify delivery confirmation details including isAutoDelivered flag.
 *
 * Setup Phase (Dependencies):
 * 1. Authenticate as Admin: POST /auth/admin/join - Create admin account
 * 2. Authenticate as Customer: POST /auth/customer/join - Create customer account
 * 3. Authenticate as Seller: POST /auth/seller/join - Create seller account
 * 4. Admin creates category: POST /admin/categories - Create product category
 * 5. Seller creates product: POST /seller/products - Create test product
 * 6. Seller creates variant: POST /seller/products/{productId}/variants - Create variant with stock
 * 7. Customer adds to cart: POST /customer/cartItems - Add variant to cart with quantity
 * 8. Customer checkout: POST /customer/checkout - Create order with paid status
 * 9. Seller creates shipment: POST /seller/shipments - Create shipment with carrier (UPS), tracking number (TRACK987)
 * 10. Customer confirms delivery: POST /customer/shipments/{shipmentId}/deliveries - Manual delivery confirmation by customer, sets isAutoDelivered to false
 *
 * Test Execution:
 * 11. Customer retrieves shipment: GET /customer/shipments/{shipmentId} using shipment ID
 *
 * Validation Points:
 * - Verify response includes complete shipment details
 * - Verify delivery object is present and not null
 * - Verify delivery.shipmentId matches shipment ID
 * - Verify delivery.customerId matches customer's ID (manual confirmation)
 * - Verify delivery.deliveredAt timestamp is present and valid
 * - Verify delivery.isAutoDelivered is false (manually confirmed by customer, not auto)
 * - Verify delivery.createdAt and delivery.updatedAt timestamps are present
 * - Verify order items in shipment have status 'delivered' after confirmation
 * - Verify seller and order summaries are populated correctly
 */
export async function test_api_shipment_customer_view_delivered(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication for category management
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  // Step 2: Customer authentication to own and confirm delivery of the shipment
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  const customerId = customerAuthorized.id;
  // Step 3: Seller authentication to create products and shipments
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  // Step 4: Create product category prerequisite
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // Step 5: Create test product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  // Step 6: Create product variant for purchase with stock
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          stock: 100,
        },
      },
    );
  // Step 7: Add variant to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      },
    },
  );
  // Step 8: Create order through checkout
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
        country: RandomGenerator.name(),
      },
    },
  );
  // Get paid order item IDs for shipment creation
  const orderItemIds = order.orderItems
    .filter((item) => item.status === "paid")
    .map((item) => (item as IEntity).id);
  // Step 9: Create shipment with tracking info
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: orderItemIds,
        carrierName: "UPS",
        trackingNumber: "TRACK987",
      },
    },
  );
  // Step 10: Confirm delivery of the shipment by customer (isAutoDelivered=false)
  await generate_random_ecommerce_mall_customer_shipments_deliveries_create(
    customerConnection,
    {
      params: {
        shipmentId: shipment.id,
      },
      body: {},
    },
  );
  // Step 11: Customer retrieves shipment
  const retrievedShipment =
    await api.functional.ecommerceMall.customer.shipments.at(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(retrievedShipment);
  // Validation Points
  // Verify delivery object is present and not null
  TestValidator.predicate(
    "delivery object is present",
    retrievedShipment.delivery !== null,
  );
  // Verify delivery.shipment matches shipment ID
  TestValidator.equals(
    "delivery.shipment matches shipment ID",
    retrievedShipment.delivery?.shipment?.id,
    shipment.id,
  );
  // Verify delivery.customer matches customer's ID (manual confirmation)
  TestValidator.equals(
    "delivery.customer matches customer's ID",
    retrievedShipment.delivery?.customer?.id,
    customerId,
  );
  // Verify delivery.isAutoDelivered is false (manually confirmed by customer, not auto)
  TestValidator.equals(
    "delivery.isAutoDelivered is false",
    retrievedShipment.delivery?.isAutoDelivered,
    false,
  );
  // Verify delivery.deliveredAt timestamp is present and valid
  TestValidator.predicate(
    "delivery.deliveredAt is present",
    !!retrievedShipment.delivery?.deliveredAt,
  );
  // Verify delivery.created_at timestamp is present
  TestValidator.predicate(
    "delivery.created_at is present",
    !!retrievedShipment.delivery?.created_at,
  );
  // Verify delivery.updated_at timestamp is present
  TestValidator.predicate(
    "delivery.updated_at is present",
    !!retrievedShipment.delivery?.updated_at,
  );
  // Verify order items in shipment have status 'delivered' after confirmation
  for (const shipmentItem of retrievedShipment.shipmentItems) {
    TestValidator.equals(
      `order item ${(shipmentItem.orderItem as IEntity).id} status is delivered`,
      "delivered",
      shipmentItem.orderItem.status,
    );
  }
  // Verify seller summary is populated correctly
  TestValidator.predicate(
    "seller summary is populated",
    !!retrievedShipment.seller.id,
  );
  // Verify order summary is populated correctly
  TestValidator.predicate(
    "order summary is populated",
    !!retrievedShipment.order.id,
  );
}
