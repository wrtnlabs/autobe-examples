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
import { generate_random_e_commerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_refund_requests_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test filtering and pagination of order item status change history.
 *
 * Validates the complete workflow from order placement through refund, verifying that sellers can query status logs with various filter combinations including to_status, reason text, date ranges, and pagination.
 *
 * The setup creates 4 status log entries (paid → shipped → delivered → refunded) then tests 7 filter combinations plus pagination across 2 pages. Each validation confirms correct entry counts, data content, and pagination metadata.
 *
 * 1. Seller creates product with a variant.
 * 2. Customer places an order (creates "paid" status log).
 * 3. Seller creates shipment (creates "shipped" status log with reason "shipment_created").
 * 4. Customer confirms delivery (creates "delivered" status log with reason "customer_delivery_confirmation").
 * 5. Customer submits refund request; seller approves (creates "refunded" status log with reason "refund_approved").
 * 6. Query status logs with filter and pagination combinations and validate results.
 */
export async function test_api_order_item_status_logs_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // ---- Step 1: Seller setup ----
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Create a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Create a variant
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // ---- Step 2: Customer setup and order placement ----
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Create a shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // Add variant to cart
  const cartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // Place order
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // ---- Step 3: Seller creates shipment (paid → shipped) ----
  const shipment =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItem.id],
          carrierName: RandomGenerator.alphabets(8),
          trackingNumber: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // ---- Step 4: Customer confirms delivery (shipped → delivered) ----
  const confirmedShipment =
    await api.functional.eCommerceMall.customer.shipments.update(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {},
      },
    );
  typia.assert(confirmedShipment);
  // ---- Step 5: Refund cycle (delivered → refunded) ----
  // Customer creates refund request
  const refundRequest =
    await generate_random_e_commerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest);
  // Seller approves the refund
  const approvedRefund =
    await api.functional.eCommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approvedRefund);
  // ---- Step 6: Query status logs with various filter combinations ----
  // Helper to query status logs
  async function queryStatusLogs(
    filters: IECommerceMallOrderItemStatusLog.IRequest,
  ): Promise<IPageIECommerceMallOrderItemStatusLog.ISummary> {
    const result =
      await api.functional.eCommerceMall.seller.orderItems.statusLogs.index(
        sellerConnection,
        {
          itemId: orderItem.id,
          body: filters,
        },
      );
    typia.assert(result);
    return result;
  }
  // 6.1. Filter by to_status = 'refunded' → 1 entry with from_status='delivered'
  const refundedLogs = await queryStatusLogs({
    to_status: "refunded",
  });
  TestValidator.equals("to_status=refunded count", refundedLogs.data.length, 1);
  TestValidator.equals(
    "to_status=refunded from_status",
    refundedLogs.data[0].from_status,
    "delivered",
  );
  TestValidator.equals(
    "to_status=refunded to_status",
    refundedLogs.data[0].to_status,
    "refunded",
  );
  // 6.2. Filter by to_status = 'shipped' → 1 entry with from_status='paid'
  const shippedLogs = await queryStatusLogs({
    to_status: "shipped",
  });
  TestValidator.equals("to_status=shipped count", shippedLogs.data.length, 1);
  TestValidator.equals(
    "to_status=shipped from_status",
    shippedLogs.data[0].from_status,
    "paid",
  );
  TestValidator.equals(
    "to_status=shipped to_status",
    shippedLogs.data[0].to_status,
    "shipped",
  );
  // 6.3. Filter by to_status = 'paid' → 1 entry with from_status=null
  const paidLogs = await queryStatusLogs({
    to_status: "paid",
  });
  TestValidator.equals("to_status=paid count", paidLogs.data.length, 1);
  TestValidator.equals(
    "to_status=paid from_status null",
    paidLogs.data[0].from_status,
    null,
  );
  TestValidator.equals(
    "to_status=paid to_status",
    paidLogs.data[0].to_status,
    "paid",
  );
  // 6.4. Filter by to_status = 'delivered' → 1 entry with from_status='shipped'
  const deliveredLogs = await queryStatusLogs({
    to_status: "delivered",
  });
  TestValidator.equals(
    "to_status=delivered count",
    deliveredLogs.data.length,
    1,
  );
  TestValidator.equals(
    "to_status=delivered from_status",
    deliveredLogs.data[0].from_status,
    "shipped",
  );
  TestValidator.equals(
    "to_status=delivered to_status",
    deliveredLogs.data[0].to_status,
    "delivered",
  );
  // 6.5. Filter by reason LIKE 'customer%' → returns the delivery confirmation entry
  const reasonLikeLogs = await queryStatusLogs({
    reason: "customer",
  });
  TestValidator.equals(
    "reason LIKE customer count",
    reasonLikeLogs.data.length,
    1,
  );
  TestValidator.equals(
    "reason LIKE customer to_status",
    reasonLikeLogs.data[0].to_status,
    "delivered",
  );
  // 6.6. Filter by created_at date range
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const dateRangeLogs = await queryStatusLogs({
    created_at_from: yesterday,
    created_at_to: now,
  });
  TestValidator.predicate(
    "date range returns entries",
    dateRangeLogs.data.length >= 4,
  );
  // 6.7. Pagination: page=1, limit=2 → returns 2 entries (newest first)
  const page1 = await queryStatusLogs({
    page: 1,
    limit: 2,
  });
  TestValidator.equals("page1 records count", page1.data.length, 2);
  TestValidator.equals("page1 pagination records", page1.pagination.records, 4);
  TestValidator.equals("page1 pagination pages", page1.pagination.pages, 2);
  TestValidator.equals("page1 pagination current", page1.pagination.current, 1);
  TestValidator.equals("page1 pagination limit", page1.pagination.limit, 2);
  // Page 1 should have the 2 newest entries (refunded, delivered)
  TestValidator.equals(
    "page1 first to_status",
    page1.data[0].to_status,
    "refunded",
  );
  TestValidator.equals(
    "page1 second to_status",
    page1.data[1].to_status,
    "delivered",
  );
  // 6.8. Pagination: page=2, limit=2 → returns remaining 2 entries (shipped, paid)
  const page2 = await queryStatusLogs({
    page: 2,
    limit: 2,
  });
  TestValidator.equals("page2 records count", page2.data.length, 2);
  TestValidator.equals("page2 pagination current", page2.pagination.current, 2);
  TestValidator.equals(
    "page2 first to_status",
    page2.data[0].to_status,
    "shipped",
  );
  TestValidator.equals(
    "page2 second to_status",
    page2.data[1].to_status,
    "paid",
  );
  // 6.9. Empty result set for to_status = 'cancelled'
  const cancelledLogs = await queryStatusLogs({
    to_status: "cancelled",
  });
  TestValidator.equals(
    "to_status=cancelled empty",
    cancelledLogs.data.length,
    0,
  );
  TestValidator.equals(
    "to_status=cancelled records zero",
    cancelledLogs.pagination.records,
    0,
  );
}
