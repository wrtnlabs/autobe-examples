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
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_customer_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_customer_shipments_filtering_by_order_and_dates(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin and category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {} as any);
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Step 2: Create seller, register, and create product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {} as any);
  await generate_random_ecommerce_mall_seller_registrations_create(
    sellerConnection,
    {},
  );
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
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Step 3: Create customer and checkout to create order 1
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {} as any);
  await generate_random_ecommerce_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      },
    },
  );
  const order1 = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order1);
  // Step 4: Create second order for same customer
  await generate_random_ecommerce_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      },
    },
  );
  const order2 = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order2);
  // Step 5: Seller creates shipment for order 1
  const orderItem1 = order1.orderItems[0] as IEntity;
  const shipment1 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItem1.id],
          carrierName: "FedEx Express",
          trackingNumber: "TRACK123456",
        },
      },
    );
  typia.assert(shipment1);
  // Step 6: Seller creates shipment for order 2
  const orderItem2 = order2.orderItems[0] as IEntity;
  const shipment2 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItem2.id],
          carrierName: "UPS Ground",
          trackingNumber: "UPS789012",
        },
      },
    );
  typia.assert(shipment2);
  // Wait briefly to ensure timestamps are different
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 7: Test filter by orderId - should return only shipment for order1
  const filterByOrderResult =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          orderId: order1.id,
        },
      },
    );
  typia.assert(filterByOrderResult);
  TestValidator.predicate(
    "filter by orderId returns only matching shipments",
    () => {
      return (
        filterByOrderResult.data.length === 1 &&
        filterByOrderResult.data[0].orderId === order1.id &&
        filterByOrderResult.data[0].id === shipment1.id
      );
    },
  );
  // Step 8: Test filter by shippedAtFrom/shippedAtTo date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const filterByDateResult =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          shippedAtFrom: yesterday,
          shippedAtTo: tomorrow,
        },
      },
    );
  typia.assert(filterByDateResult);
  TestValidator.predicate(
    "filter by date range returns shipments within range",
    () => {
      return filterByDateResult.data.length >= 2;
    },
  );
  // Step 9: Test filter by carrierName partial match (e.g., 'Fed' matches 'FedEx')
  const filterByCarrierResult =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          carrierName: "Fed",
        },
      },
    );
  typia.assert(filterByCarrierResult);
  TestValidator.predicate(
    "filter by carrierName partial match returns matching shipments",
    () => {
      return (
        filterByCarrierResult.data.length === 1 &&
        filterByCarrierResult.data[0].carrierName.includes("FedEx")
      );
    },
  );
  // Step 10: Test filter by trackingNumber partial match
  const filterByTrackingResult =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          trackingNumber: "TRACK",
        },
      },
    );
  typia.assert(filterByTrackingResult);
  TestValidator.predicate(
    "filter by trackingNumber partial match returns matching shipments",
    () => {
      return (
        filterByTrackingResult.data.length === 1 &&
        filterByTrackingResult.data[0].trackingNumber.includes("TRACK123456")
      );
    },
  );
  // Step 11: Test combined filters (orderId + carrierName)
  const filterCombinedResult =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          orderId: order1.id,
          carrierName: "FedEx",
        },
      },
    );
  typia.assert(filterCombinedResult);
  TestValidator.predicate("combined filters work together", () => {
    return (
      filterCombinedResult.data.length === 1 &&
      filterCombinedResult.data[0].orderId === order1.id &&
      filterCombinedResult.data[0].carrierName === "FedEx Express"
    );
  });
  // Step 12: Test pagination
  const paginatedResult =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate("pagination returns correct structure", () => {
    return (
      paginatedResult.pagination.current === 1 &&
      paginatedResult.pagination.limit === 10 &&
      paginatedResult.data.length >= 2
    );
  });
  // Step 13: Test combined filters that should return no results
  const filterNoResultsResult =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          orderId: order1.id,
          carrierName: "UPS", // order1 has FedEx, not UPS
        },
      },
    );
  typia.assert(filterNoResultsResult);
  TestValidator.predicate(
    "conflicting combined filters return empty results",
    () => {
      return filterNoResultsResult.data.length === 0;
    },
  );
}