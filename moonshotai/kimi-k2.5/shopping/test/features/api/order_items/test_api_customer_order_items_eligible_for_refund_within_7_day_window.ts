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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
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
 * Test customer can successfully retrieve order items eligible for refund when they have delivered items within the 7-day return window.
 *
 * Scenario covers:
 * 1. Admin creates category
 * 2. Seller creates product and variant
 * 3. Customer adds to cart, proceeds to checkout and creates order
 * 4. Seller creates shipment for the paid order items
 * 5. Customer confirms delivery to update order item status to 'delivered' and record delivery timestamp
 * 6. Customer queries eligibleForRefund within 7 days of delivery and receives the order item in results
 * 7. Validate pagination defaults and response structure with all required fields
 */
export async function test_api_customer_order_items_eligible_for_refund_within_7_day_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assertGuard(admin);
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller authentication and product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assertGuard(seller);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
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
  typia.assert(variant);
  // 3. Customer authentication, cart and checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assertGuard(customer);
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
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order items exist and are in 'paid' status
  const paidOrderItems = order.orderItems.filter(
    (item) => item.status === "paid",
  );
  TestValidator.predicate(
    "Order items should exist and be in paid status",
    paidOrderItems.length > 0,
  );
  // 4. Seller creates shipment for order items
  const orderItemIds = paidOrderItems.map(
    (item) => ((item as IEntity).id) satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">,
  );
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds,
        carrierName: "FedEx",
        trackingNumber: "TRK123456789",
      },
    },
  );
  typia.assert(shipment);
  TestValidator.equals(
    "Shipment has correct order items",
    shipment.shipmentItems.length,
    paidOrderItems.length,
  );
  // 5. Customer confirms delivery
  const delivery =
    await generate_random_ecommerce_mall_customer_shipments_deliveries_create(
      customerConnection,
      {
        params: {
          shipmentId: shipment.id,
        },
        body: {},
      },
    );
  typia.assert(delivery);
  TestValidator.predicate(
    "Delivery is confirmed",
    delivery.deliveredAt !== null,
  );
  TestValidator.predicate(
    "Delivery is auto-delivered or manually confirmed",
    delivery.isAutoDelivered !== null,
  );
  // 6. Customer queries eligible for refund - should get delivered items within 7 days
  const refundRequestBody = {
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallOrderItem.IEligibleForRefundRequest;
  const eligibleItems =
    await api.functional.ecommerceMall.customer.orderItems.eligibleForRefund.index(
      customerConnection,
      {
        body: refundRequestBody,
      },
    );
  typia.assert(eligibleItems);
  // 7. Validate response structure and pagination
  TestValidator.predicate(
    "Pagination exists and has correct defaults",
    eligibleItems.pagination.current === 1 &&
      eligibleItems.pagination.limit === 10,
  );
  TestValidator.predicate(
    "Data array exists",
    Array.isArray(eligibleItems.data),
  );
  TestValidator.predicate(
    "Order items found in eligible refund list",
    eligibleItems.data.length > 0,
  );
  // Validate the order item has required fields
  const eligibleItem = eligibleItems.data.find((item) =>
    orderItemIds.some((oid) => oid === item.id),
  );
  TestValidator.predicate(
    "Order item from the test order is in eligible list",
    eligibleItem !== undefined,
  );
  if (eligibleItem) {
    TestValidator.predicate(
      "Eligible item has id",
      typia.is<string & tags.Format<"uuid">>(eligibleItem.id),
    );
    TestValidator.predicate(
      "Eligible item has quantity",
      typeof eligibleItem.quantity === "number" && eligibleItem.quantity > 0,
    );
    TestValidator.predicate(
      "Eligible item has priceAtPurchase",
      typeof eligibleItem.priceAtPurchase === "number" &&
        eligibleItem.priceAtPurchase >= 0,
    );
    TestValidator.equals(
      "Eligible item status is delivered",
      eligibleItem.status,
      "delivered",
    );
    TestValidator.predicate(
      "Eligible item has createdAt",
      typia.is<string & tags.Format<"date-time">>(eligibleItem.createdAt),
    );
    TestValidator.predicate(
      "Eligible item has product summary",
      eligibleItem.product !== undefined && eligibleItem.product !== null,
    );
    TestValidator.predicate(
      "Eligible item has variant summary",
      eligibleItem.variant !== undefined && eligibleItem.variant !== null,
    );
    TestValidator.predicate(
      "Eligible item has seller summary",
      eligibleItem.seller !== undefined && eligibleItem.seller !== null,
    );
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "Pagination records is non-negative",
    eligibleItems.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Pagination pages is non-negative",
    eligibleItems.pagination.pages >= 0,
  );
}