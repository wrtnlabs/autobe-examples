import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_checkout_complete } from "../../../generate/generate_random_shopping_mall_customer_checkout_complete";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test filtering shipments by order ID and carrier name.
 * Validates: orderId filter, carrierName case-insensitive partial match,
 * combined filters, search field, cross-seller isolation, and date range filters.
 */
export async function test_api_seller_shipment_filter_order_carrier(
  connection: api.IConnection,
): Promise<void> {
  // === SETUP: Create Seller 1 with products ===
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: { shopName: RandomGenerator.name() },
  });
  typia.assert(seller1Auth);
  const product1 =
    await generate_random_shopping_mall_seller_seller_products_create(
      seller1Connection,
      { body: {} },
    );
  typia.assert(product1);
  // Create 3 variants for multiple shipments
  const variants = await ArrayUtil.asyncRepeat(3, async () => {
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create(
        seller1Connection,
        { params: { productId: product1.id }, body: {} },
      );
    typia.assert(variant);
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      seller1Connection,
      {
        params: { variantId: variant.id },
        body: { quantity_change: 10, reason: "Initial stock" },
      },
    );
    return variant;
  });
  // === SETUP: Create Customer and place order ===
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  for (const variant of variants) {
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      { body: { variantId: variant.id, quantity: 1 } },
    );
  }
  const order = await generate_random_shopping_mall_customer_checkout_complete(
    customerConnection,
    { body: {} },
  );
  typia.assert(order);
  const seller1OrderItems = order.orderItems.filter(
    (item) => item.seller.id === seller1Auth.id,
  );
  // === SETUP: Create shipments with different carriers ===
  const shipmentFedEx =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      seller1Connection,
      {
        body: {
          carrierName: "FedEx Express",
          trackingNumber: "FX-" + RandomGenerator.alphaNumeric(10),
          orderId: order.id,
          orderItemIds: [seller1OrderItems[0].id],
        },
      },
    );
  typia.assert(shipmentFedEx);
  const shipmentUPS =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      seller1Connection,
      {
        body: {
          carrierName: "UPS Ground",
          trackingNumber: "UPS-" + RandomGenerator.alphaNumeric(10),
          orderId: order.id,
          orderItemIds: [seller1OrderItems[1].id],
        },
      },
    );
  typia.assert(shipmentUPS);
  const shipmentDHL =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      seller1Connection,
      {
        body: {
          carrierName: "DHL Express",
          trackingNumber: "DHL-" + RandomGenerator.alphaNumeric(10),
          orderId: order.id,
          orderItemIds: [seller1OrderItems[2].id],
        },
      },
    );
  typia.assert(shipmentDHL);
  // === TEST 1: Filter by orderId ===
  const filteredByOrderId =
    await api.functional.shoppingMall.seller.shipments.index(
      seller1Connection,
      { body: { orderId: order.id } },
    );
  typia.assert(filteredByOrderId);
  TestValidator.predicate(
    "orderId filter returns only shipments for specified order",
    filteredByOrderId.data.every((s) => s.order.id === order.id),
  );
  TestValidator.equals(
    "orderId filter returns all seller's shipments for order",
    filteredByOrderId.data.length,
    3,
  );
  // === TEST 2: Filter by carrierName (case-insensitive partial match) ===
  const filteredByCarrier =
    await api.functional.shoppingMall.seller.shipments.index(
      seller1Connection,
      { body: { carrierName: "fedex" } },
    );
  typia.assert(filteredByCarrier);
  TestValidator.predicate(
    "carrierName filter performs case-insensitive partial matching",
    filteredByCarrier.data.every((s) =>
      s.carrierName.toLowerCase().includes("fedex"),
    ),
  );
  // === TEST 3: Combined filters (orderId + carrierName) ===
  const combinedFilter =
    await api.functional.shoppingMall.seller.shipments.index(
      seller1Connection,
      { body: { orderId: order.id, carrierName: "DHL" } },
    );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined orderId+carrierName filter returns correct count",
    combinedFilter.data.length,
    1,
  );
  TestValidator.predicate(
    "combined filter matches both orderId and carrierName",
    combinedFilter.data.every(
      (s) =>
        s.order.id === order.id && s.carrierName.toLowerCase().includes("dhl"),
    ),
  );
  // === TEST 4: Search field searches carrier_name ===
  const searchByCarrier =
    await api.functional.shoppingMall.seller.shipments.index(
      seller1Connection,
      { body: { search: "FedEx" } },
    );
  typia.assert(searchByCarrier);
  TestValidator.predicate(
    "search field finds by carrier name",
    searchByCarrier.data.some((s) =>
      s.carrierName.toLowerCase().includes("fedex"),
    ),
  );
  // === TEST 5: Search field searches tracking_number ===
  const searchByTracking =
    await api.functional.shoppingMall.seller.shipments.index(
      seller1Connection,
      { body: { search: shipmentUPS.trackingNumber } },
    );
  typia.assert(searchByTracking);
  TestValidator.predicate(
    "search field finds by tracking number",
    searchByTracking.data.some(
      (s) => s.trackingNumber === shipmentUPS.trackingNumber,
    ),
  );
  // === TEST 6: Cross-seller isolation ===
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {
    body: { shopName: RandomGenerator.name() },
  });
  const otherSellerShipments =
    await api.functional.shoppingMall.seller.shipments.index(
      seller2Connection,
      { body: { orderId: order.id } },
    );
  typia.assert(otherSellerShipments);
  TestValidator.equals(
    "sellers cannot view other sellers' shipments",
    otherSellerShipments.data.length,
    0,
  );
  // === TEST 7: Date range filter (shippedFrom/shippedTo) ===
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateFiltered = await api.functional.shoppingMall.seller.shipments.index(
    seller1Connection,
    {
      body: {
        shippedFrom: yesterday.toISOString(),
        shippedTo: tomorrow.toISOString(),
      },
    },
  );
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "date range filter returns shipments shipped within range",
    dateFiltered.data.every((s) => {
      const shippedAt = new Date(s.shippedAt);
      return shippedAt >= yesterday && shippedAt <= tomorrow;
    }),
  );
}
