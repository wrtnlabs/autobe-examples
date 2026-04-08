import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_order_shipment_listing_with_tracking(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // SETUP: Create two sellers
  // ============================================================
  // Create first seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {});
  typia.assert(seller1Auth);
  // Create second seller
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {});
  typia.assert(seller2Auth);
  // ============================================================
  // Create products with variants for both sellers
  // ============================================================
  // Seller 1 creates product
  const seller1Product =
    await generate_random_ecommerce_mall_seller_products_create(
      seller1Connection,
      {},
    );
  typia.assert(seller1Product);
  // Get variant from seller1's product
  const seller1Variant = seller1Product.variants[0];
  if (!seller1Variant) {
    throw new Error("Seller 1 product has no variants");
  }
  // Set inventory for seller1's variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    seller1Connection,
    {
      params: {
        productId: seller1Product.id,
        variantId: seller1Variant.id,
      },
      body: {
        quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        operationType: "restock" as const,
        reason: "Initial stock",
      },
    },
  );
  // Seller 2 creates product
  const seller2Product =
    await generate_random_ecommerce_mall_seller_products_create(
      seller2Connection,
      {},
    );
  typia.assert(seller2Product);
  // Get variant from seller2's product
  const seller2Variant = seller2Product.variants[0];
  if (!seller2Variant) {
    throw new Error("Seller 2 product has no variants");
  }
  // Set inventory for seller2's variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    seller2Connection,
    {
      params: {
        productId: seller2Product.id,
        variantId: seller2Variant.id,
      },
      body: {
        quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        operationType: "restock" as const,
        reason: "Initial stock",
      },
    },
  );
  // ============================================================
  // Create customer and add items to cart
  // ============================================================
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Add seller1's variant to cart
  await generate_random_ecommerce_mall_customer_customers_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: seller1Variant.id,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    },
  );
  // Add seller2's variant to cart
  await generate_random_ecommerce_mall_customer_customers_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: seller2Variant.id,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    },
  );
  // ============================================================
  // Customer checkout - creates order with items from both sellers
  // ============================================================
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(order);
  // Find order items belonging to each seller
  const seller1OrderItem = order.orderItems.find(
    (item) => item.productSnapshot.seller.id === seller1Auth.id,
  );
  const seller2OrderItem = order.orderItems.find(
    (item) => item.productSnapshot.seller.id === seller2Auth.id,
  );
  if (!seller1OrderItem || !seller2OrderItem) {
    throw new Error("Order items not found for both sellers");
  }
  // ============================================================
  // Seller 1 ships their items
  // ============================================================
  const carrierName = "DHL Express";
  const trackingNumber = "1234567890";
  await generate_random_ecommerce_mall_seller_orders_shipments_create(
    seller1Connection,
    {
      params: {
        orderId: order.id,
      },
      body: {
        orderItemIds: [seller1OrderItem.id],
        carrier: carrierName,
        trackingNumber: trackingNumber,
      },
    },
  );
  // ============================================================
  // Customer lists shipments for the order
  // ============================================================
  const shipmentsResponse =
    await api.functional.ecommerceMall.orders.shipments.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<50>,
        },
      },
    );
  typia.assert(shipmentsResponse);
  // ============================================================
  // VALIDATION: Check shipment listing response
  // ============================================================
  // Cast pagination through unknown to access the expected fields
  const pagination = shipmentsResponse.pagination as unknown as {
    current: number;
    limit: number;
    records: number;
    pages: number;
  };
  // Validate pagination metadata exists
  TestValidator.equals(
    "pagination metadata exists",
    shipmentsResponse.pagination !== null &&
      shipmentsResponse.pagination !== undefined,
    true,
  );
  // Validate pagination fields
  TestValidator.predicate(
    "pagination has current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit >= 1",
    pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has total records >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages >= 0",
    pagination.pages >= 0,
  );
  // Validate shipments data array exists
  TestValidator.equals(
    "shipments data array exists",
    Array.isArray(shipmentsResponse.data),
    true,
  );
  // Validate at least one shipment exists
  TestValidator.predicate(
    "at least one shipment exists",
    shipmentsResponse.data.length >= 1,
  );
  // Validate shipment summary properties
  for (const ship of shipmentsResponse.data) {
    // id exists
    TestValidator.equals(
      "shipment has id",
      typeof ship.id === "string" && ship.id.length > 0,
      true,
    );
    // carrier exists and is non-empty
    TestValidator.equals(
      "shipment has carrier",
      typeof ship.carrier === "string" && ship.carrier.length > 0,
      true,
    );
    // tracking_number exists and is non-empty
    TestValidator.equals(
      "shipment has tracking number",
      typeof ship.trackingNumber === "string" && ship.trackingNumber.length > 0,
      true,
    );
    // created_at exists
    TestValidator.equals(
      "shipment has created_at",
      typeof ship.createdAt === "string" && ship.createdAt.length > 0,
      true,
    );
    // item_count exists and is positive
    TestValidator.predicate(
      "shipment has valid item count >= 1",
      typeof ship.itemCount === "number" && ship.itemCount >= 1,
    );
    // seller info exists
    TestValidator.equals(
      "shipment has seller info",
      ship.seller !== null && ship.seller !== undefined,
      true,
    );
    // seller has id
    TestValidator.equals(
      "seller has id",
      typeof ship.seller.id === "string" && ship.seller.id.length > 0,
      true,
    );
    // seller has email
    TestValidator.equals(
      "seller has email",
      typeof ship.seller.email === "string" && ship.seller.email.length > 0,
      true,
    );
    // seller has approvalStatus
    TestValidator.equals(
      "seller has approvalStatus",
      typeof ship.seller.approvalStatus === "string",
      true,
    );
  }
  // Validate newest-first ordering (created_at descending)
  for (let i = 1; i < shipmentsResponse.data.length; i++) {
    const current = new Date(shipmentsResponse.data[i].createdAt).getTime();
    const previous = new Date(
      shipmentsResponse.data[i - 1].createdAt,
    ).getTime();
    TestValidator.predicate(
      "shipments ordered newest first",
      current <= previous,
    );
  }
  // Validate the shipped shipment has correct tracking info
  const shippedShipment = shipmentsResponse.data.find(
    (s) => s.trackingNumber === trackingNumber,
  );
  TestValidator.notEquals(
    "shipment with tracking number exists",
    shippedShipment,
    null,
  );
  if (shippedShipment) {
    TestValidator.equals(
      "carrier matches",
      shippedShipment.carrier,
      carrierName,
    );
  }
}