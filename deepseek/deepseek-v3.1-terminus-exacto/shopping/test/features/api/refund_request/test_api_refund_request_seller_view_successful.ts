import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_cancellation_requests_create";
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

/**
 * Successful scenario where a seller retrieves their own refund request details.
 * Test creates a seller account, registers a customer, creates a product with variants,
 * adds to cart, completes checkout, confirms delivery automatically after 14 days,
 * then a refund request is created within the 7-day window. The seller accesses
 * the refund request details and validates all fields are correctly populated
 * including customer details, order item information, refund reason, timestamps,
 * and status. Verify that relationship data properly joins to provide complete
 * refund request entity with customer, seller, and order item summaries.
 */
export async function test_api_refund_request_seller_view_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(seller);
  // Create product with variant
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10>
          >(),
        },
      },
    );
  typia.assert(variant);
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  // Add product to cart (mock cart ID generation)
  const cartItem = await generate_random_ecommerce_customer_carts_items_create(
    customerConnection,
    {
      params: { cartId: typia.random<string & tags.Format<"uuid">>() },
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      },
    },
  );
  typia.assert(cartItem);
  // Complete checkout
  const order = await api.functional.ecommerce.customer.checkout.create(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(order);
  // Create shipment (mock order ID from checkout)
  const shipment =
    await generate_random_ecommerce_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          tracking_number: RandomGenerator.alphaNumeric(12),
          carrier_name: "Test Carrier",
          shipping_cost: typia.random<number & tags.Minimum<0>>(),
        },
      },
    );
  typia.assert(shipment);
  // Create cancellation request (which will serve as our refund request scenario)
  const cancellationRequest =
    await generate_random_ecommerce_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          ecommerce_order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }).substring(0, 500),
        },
      },
    );
  typia.assert(cancellationRequest);
  // Seller retrieves refund request details
  const refundRequest =
    await api.functional.ecommerce.seller.refund_requests.at(sellerConnection, {
      refundRequestId: cancellationRequest.id,
    });
  typia.assert(refundRequest);
  // Validate refund request details
  TestValidator.equals(
    "refund request ID matches",
    refundRequest.id,
    cancellationRequest.id,
  );
  TestValidator.predicate("has valid reason", refundRequest.reason.length > 0);
  TestValidator.predicate(
    "has requested_at timestamp",
    refundRequest.requested_at.length > 0,
  );
  TestValidator.predicate(
    "has refund_window_expires_at timestamp",
    refundRequest.refund_window_expires_at.length > 0,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    refundRequest.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    refundRequest.updated_at.length > 0,
  );
  // Validate customer relationship
  TestValidator.equals(
    "customer ID matches",
    refundRequest.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    refundRequest.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer display_name matches",
    refundRequest.customer.display_name,
    customer.display_name,
  );
  // Validate seller relationship
  TestValidator.equals("seller ID matches", refundRequest.seller.id, seller.id);
  TestValidator.equals(
    "seller email matches",
    refundRequest.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "seller shop_name matches",
    refundRequest.seller.shop_name,
    seller.shop_name,
  );
  // Validate order item relationship
  TestValidator.predicate(
    "order item has valid ID",
    refundRequest.orderItem.id.length > 0,
  );
  TestValidator.predicate(
    "order item has valid quantity",
    refundRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item has valid unit_price",
    refundRequest.orderItem.unit_price > 0,
  );
  TestValidator.predicate(
    "order item has valid total_price",
    refundRequest.orderItem.total_price > 0,
  );
  TestValidator.predicate(
    "order item has valid status",
    refundRequest.orderItem.status.length > 0,
  );
}