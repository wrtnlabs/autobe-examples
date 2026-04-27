import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallOrderItemStatusLog";
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
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test that a seller can view the complete status change history for an order item after it progresses through the full fulfillment lifecycle: paid → shipped → delivered.
 *
 * Validates the creation and retrieval of 3 status log entries with correct transition data (from_status, to_status, reason), proper chronological ordering (newest first), accurate pagination metadata, and correct filtering by to_status.
 *
 * Special attention is given to verifying the initial 'paid' entry with null from_status and null reason, the 'shipment_created' transition, and the 'customer_delivery_confirmation' transition.
 *
 * 1. Seller registers, creates a product, and adds a variant
 * 2. Customer registers, creates a shipping address, adds the variant to cart, and places the order
 * 3. Seller creates a shipment containing the order item (paid → shipped)
 * 4. Customer confirms delivery of the shipment (shipped → delivered)
 * 5. Seller retrieves status logs and validates all 3 entries, pagination metadata, and filtering
 */
export async function test_api_order_item_status_logs_full_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // -------------------------------------------------------
  // 1. SELLER SETUP: Register, create product & variant
  // -------------------------------------------------------
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // -------------------------------------------------------
  // 2. CUSTOMER SETUP: Register, create address, add to cart, place order
  // -------------------------------------------------------
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // Add variant to cart
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 2,
      },
    },
  );
  // Place the order
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  const orderItem = order.orderItems[0]!;
  typia.assert(orderItem);
  // -------------------------------------------------------
  // 3. SELLER CREATES SHIPMENT (paid → shipped)
  // -------------------------------------------------------
  const shipment =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItem.id],
          carrierName: "Test Carrier",
          trackingNumber: "TRACK-" + RandomGenerator.alphaNumeric(8),
        },
      },
    );
  typia.assert(shipment);
  // -------------------------------------------------------
  // 4. CUSTOMER CONFIRMS DELIVERY (shipped → delivered)
  // -------------------------------------------------------
  const updatedShipment =
    await api.functional.eCommerceMall.customer.shipments.update(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {},
      },
    );
  typia.assert(updatedShipment);
  // -------------------------------------------------------
  // 5. SELLER RETRIEVES STATUS LOGS
  // -------------------------------------------------------
  const statusLogsPage =
    await api.functional.eCommerceMall.seller.orderItems.statusLogs.index(
      sellerConnection,
      {
        itemId: orderItem.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(statusLogsPage);
  // -------------------------------------------------------
  // 6. VALIDATE STATUS LOGS
  // -------------------------------------------------------
  const { pagination, data } = statusLogsPage;
  // Pagination validation
  TestValidator.equals("page number", pagination.current, 1);
  TestValidator.equals("page limit", pagination.limit, 20);
  TestValidator.equals("total records", pagination.records, 3);
  TestValidator.equals("total pages", pagination.pages, 1);
  // Exactly 3 log entries
  TestValidator.equals("status log count", data.length, 3);
  // Logs are ordered by created_at descending (newest first)
  const sortedByCreatedAtDesc = [...data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  TestValidator.equals("logs sorted newest first", data, sortedByCreatedAtDesc);
  // Entry 1 (newest): to_status='delivered', from_status='shipped', reason='customer_delivery_confirmation'
  const entryDelivered = data[0]!;
  TestValidator.equals(
    "entry 1 to_status",
    entryDelivered.to_status,
    "delivered",
  );
  TestValidator.equals(
    "entry 1 from_status",
    entryDelivered.from_status,
    "shipped",
  );
  TestValidator.equals(
    "entry 1 reason",
    entryDelivered.reason,
    "customer_delivery_confirmation",
  );
  // Entry 2: to_status='shipped', from_status='paid', reason='shipment_created'
  const entryShipped = data[1]!;
  TestValidator.equals("entry 2 to_status", entryShipped.to_status, "shipped");
  TestValidator.equals("entry 2 from_status", entryShipped.from_status, "paid");
  TestValidator.equals(
    "entry 2 reason",
    entryShipped.reason,
    "shipment_created",
  );
  // Entry 3 (oldest): to_status='paid', from_status=null, reason=null
  const entryPaid = data[2]!;
  TestValidator.equals("entry 3 to_status", entryPaid.to_status, "paid");
  TestValidator.equals("entry 3 from_status", entryPaid.from_status, null);
  TestValidator.equals("entry 3 reason", entryPaid.reason, null);
  // All entries have non-null id, orderItem reference, and timestamps
  for (const entry of data) {
    TestValidator.predicate("entry has valid id", () => entry.id.length > 0);
    TestValidator.predicate(
      "entry has orderItem reference",
      () => entry.orderItem.id.length > 0,
    );
    TestValidator.predicate(
      "entry has created_at",
      () => entry.created_at.length > 0,
    );
  }
  // -------------------------------------------------------
  // 7. VALIDATE FILTERING BY to_status
  // -------------------------------------------------------
  // Filter by 'delivered' — returns only the delivery entry
  const deliveredLogs =
    await api.functional.eCommerceMall.seller.orderItems.statusLogs.index(
      sellerConnection,
      {
        itemId: orderItem.id,
        body: {
          page: 1,
          limit: 20,
          to_status: "delivered",
        },
      },
    );
  typia.assert(deliveredLogs);
  TestValidator.equals("filter delivered count", deliveredLogs.data.length, 1);
  TestValidator.equals(
    "filter delivered status",
    deliveredLogs.data[0]!.to_status,
    "delivered",
  );
  // Filter by 'paid' — returns only the initial entry
  const paidLogs =
    await api.functional.eCommerceMall.seller.orderItems.statusLogs.index(
      sellerConnection,
      {
        itemId: orderItem.id,
        body: {
          page: 1,
          limit: 20,
          to_status: "paid",
        },
      },
    );
  typia.assert(paidLogs);
  TestValidator.equals("filter paid count", paidLogs.data.length, 1);
  TestValidator.equals(
    "filter paid status",
    paidLogs.data[0]!.to_status,
    "paid",
  );
  // Filter by 'cancelled' — returns empty array
  const cancelledLogs =
    await api.functional.eCommerceMall.seller.orderItems.statusLogs.index(
      sellerConnection,
      {
        itemId: orderItem.id,
        body: {
          page: 1,
          limit: 20,
          to_status: "cancelled",
        },
      },
    );
  typia.assert(cancelledLogs);
  TestValidator.equals("filter cancelled count", cancelledLogs.data.length, 0);
}
