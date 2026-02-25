import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeliveryConfirmation";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { generate_random_ecommerce_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_refund_requests_create";
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

/**
 * Test administrator access to a refund request that has been created through the normal customer-seller workflow.
 * 1. Create administrator, customer, and seller accounts
 * 2. Seller creates product and variant
 * 3. Customer adds product to cart and completes checkout
 * 4. Seller creates shipment for the order
 * 5. Customer confirms delivery
 * 6. Customer submits refund request within 7-day window
 * 7. Administrator accesses the refund request and validates complete details
 */
export async function test_api_refund_requests_administrator_access(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Seller creates a product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }).substring(0, 50),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Minimum<1000>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Seller creates a product variant with inventory
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({ color: "red", size: "medium" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Customer adds product variant to cart
  const cartItem = await generate_random_ecommerce_customer_carts_items_create(
    customerConnection,
    {
      params: { cartId: typia.random<string & tags.Format<"uuid">>() },
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // Customer completes checkout to create order
  const order = await api.functional.ecommerce.customer.checkout.create(
    customerConnection,
    {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        customer_id: customerAuth.id,
        created_after: new Date().toISOString(),
        created_before: null,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(order);
  // Seller creates shipment for the order
  const shipment =
    await generate_random_ecommerce_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          tracking_number: RandomGenerator.alphaNumeric(12),
          carrier_name: "Test Carrier",
          shipping_cost: typia.random<number & tags.Minimum<0>>(),
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Customer confirms delivery
  const deliveryConfirmation =
    await api.functional.ecommerce.customer.shipments.delivery_confirmations.create(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveryConfirmation);
  // Customer submits refund request within 7-day window
  const refundRequest =
    await generate_random_ecommerce_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }).substring(0, 50),
        } satisfies IEcommerceRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Administrator accesses the refund request
  const retrievedRefundRequest =
    await api.functional.ecommerce.administrator.refund_requests.at(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // Validate complete refund request details
  TestValidator.equals(
    "refund request ID matches",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRefundRequest.reason,
    refundRequest.reason,
  );
  TestValidator.predicate(
    "has customer information",
    retrievedRefundRequest.customer !== null,
  );
  TestValidator.predicate(
    "has seller information",
    retrievedRefundRequest.seller !== null,
  );
  TestValidator.predicate(
    "has order item information",
    retrievedRefundRequest.orderItem !== null,
  );
  TestValidator.predicate(
    "has requested at timestamp",
    retrievedRefundRequest.requested_at !== null,
  );
  TestValidator.predicate(
    "has refund window expiration",
    retrievedRefundRequest.refund_window_expires_at !== null,
  );
  TestValidator.predicate(
    "has created at timestamp",
    retrievedRefundRequest.created_at !== null,
  );
  TestValidator.predicate(
    "has updated at timestamp",
    retrievedRefundRequest.updated_at !== null,
  );
  // Validate customer information
  TestValidator.equals(
    "customer ID matches",
    retrievedRefundRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedRefundRequest.customer.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "customer display name matches",
    retrievedRefundRequest.customer.display_name,
    customerAuth.display_name,
  );
  // Validate seller information
  TestValidator.equals(
    "seller ID matches",
    retrievedRefundRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedRefundRequest.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "seller shop name matches",
    retrievedRefundRequest.seller.shop_name,
    sellerAuth.shop_name,
  );
  // Validate order item information
  TestValidator.predicate(
    "order item has valid quantity",
    retrievedRefundRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item has valid unit price",
    retrievedRefundRequest.orderItem.unit_price > 0,
  );
  TestValidator.predicate(
    "order item has valid total price",
    retrievedRefundRequest.orderItem.total_price > 0,
  );
  TestValidator.predicate(
    "order item has product variant",
    retrievedRefundRequest.orderItem.productVariant !== null,
  );
  TestValidator.predicate(
    "order item has seller",
    retrievedRefundRequest.orderItem.seller !== null,
  );
}
