import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_refund_request_snapshots_filtered_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create multiple products with variants and inventory
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product1);
  const variant1 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: { quantity: 10 },
      },
    );
  typia.assert(variant1);
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product2);
  const variant2 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: { quantity: 10 },
      },
    );
  typia.assert(variant2);
  const product3 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product3);
  const variant3 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product3.id },
        body: { quantity: 10 },
      },
    );
  typia.assert(variant3);
  // 3. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // First order with product1 variant
  const order1 =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_token_1",
          page: null,
          limit: null,
        },
      },
    );
  typia.assert(order1);
  // Second order with product2 variant
  const order2 =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_token_2",
          page: null,
          limit: null,
        },
      },
    );
  typia.assert(order2);
  // Third order with product3 variant
  const order3 =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_token_3",
          page: null,
          limit: null,
        },
      },
    );
  typia.assert(order3);
  // 4. Complete delivery for all orders
  // Ship and deliver order 1
  const shipment1 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderId: order1.id,
          orderItemIds: [order1.orderItems[0].id],
          carrier: "DHL",
          trackingNumber: "TRACK001",
        },
      },
    );
  typia.assert(shipment1);
  await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order1.id,
      shipmentId: shipment1.id,
    },
  );
  // Ship and deliver order 2
  const shipment2 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderId: order2.id,
          orderItemIds: [order2.orderItems[0].id],
          carrier: "FedEx",
          trackingNumber: "TRACK002",
        },
      },
    );
  typia.assert(shipment2);
  await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order2.id,
      shipmentId: shipment2.id,
    },
  );
  // Ship and deliver order 3
  const shipment3 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderId: order3.id,
          orderItemIds: [order3.orderItems[0].id],
          carrier: "UPS",
          trackingNumber: "TRACK003",
        },
      },
    );
  typia.assert(shipment3);
  await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order3.id,
      shipmentId: shipment3.id,
    },
  );
  // 5. Create refund requests using the PATCH endpoint (only available for listing)
  // Note: Customer refund request creation is handled via the patch endpoint
  // We need to check what fields are available in IEcommerceMallRefundRequest.IRequest
  // Based on the DTO: created_at_from, created_at_to, customer_id, limit, order_item_id, page, reason_keyword, seller_id, status
  // List refund requests to check existing ones (filtering by order_item_id)
  const refundRequest1List =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          order_item_id: order1.orderItems[0].id,
        },
      },
    );
  typia.assert(refundRequest1List);
  // 6. Seller approves some and rejects others
  // Process first refund request if exists
  if (refundRequest1List.data.length > 0) {
    const refundRequest1 = refundRequest1List.data[0];
    const approved1 =
      await api.functional.ecommerceMall.seller.refund_requests.approve(
        sellerConnection,
        {
          requestId: refundRequest1.id,
        },
      );
    typia.assert(approved1);
  }
  // Check and process second refund request
  const refundRequest2List =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          order_item_id: order2.orderItems[0].id,
        },
      },
    );
  typia.assert(refundRequest2List);
  if (refundRequest2List.data.length > 0) {
    const refundRequest2 = refundRequest2List.data[0];
    const rejected1 =
      await api.functional.ecommerceMall.seller.refund_requests.reject(
        sellerConnection,
        {
          requestId: refundRequest2.id,
          body: {
            seller_response_reason: "Item was correctly shipped",
          },
        },
      );
    typia.assert(rejected1);
  }
  // Check and process third refund request
  const refundRequest3List =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          order_item_id: order3.orderItems[0].id,
        },
      },
    );
  typia.assert(refundRequest3List);
  if (refundRequest3List.data.length > 0) {
    const refundRequest3 = refundRequest3List.data[0];
    const approved2 =
      await api.functional.ecommerceMall.seller.refund_requests.approve(
        sellerConnection,
        {
          requestId: refundRequest3.id,
        },
      );
    typia.assert(approved2);
  }
  // 8. Get all snapshots first
  const allSnapshots =
    await api.functional.ecommerceMall.seller.refund_request_snapshots.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(allSnapshots);
  // 9. Filter by seller_response = 'approved'
  const approvedSnapshots =
    await api.functional.ecommerceMall.seller.refund_request_snapshots.index(
      sellerConnection,
      {
        body: {
          seller_response: "approved",
        },
      },
    );
  typia.assert(approvedSnapshots);
  for (const snapshot of approvedSnapshots.data) {
    TestValidator.equals(
      "seller_response is approved",
      snapshot.seller_response,
      "approved",
    );
  }
  // 10. Filter by seller_response = 'rejected'
  const rejectedSnapshots =
    await api.functional.ecommerceMall.seller.refund_request_snapshots.index(
      sellerConnection,
      {
        body: {
          seller_response: "rejected",
        },
      },
    );
  typia.assert(rejectedSnapshots);
  for (const snapshot of rejectedSnapshots.data) {
    TestValidator.equals(
      "seller_response is rejected",
      snapshot.seller_response,
      "rejected",
    );
  }
  // 12. Filter by snapshot_status = 'approved'
  const statusApprovedSnapshots =
    await api.functional.ecommerceMall.seller.refund_request_snapshots.index(
      sellerConnection,
      {
        body: {
          snapshot_status: "approved",
        },
      },
    );
  typia.assert(statusApprovedSnapshots);
  for (const snapshot of statusApprovedSnapshots.data) {
    TestValidator.equals(
      "snapshot_status is approved",
      snapshot.snapshot_status,
      "approved",
    );
  }
  // 14. Filter by date range
  if (allSnapshots.data.length > 0) {
    const firstSnapshotDate = new Date(allSnapshots.data[0].created_at);
    const startDate = new Date(firstSnapshotDate.getTime() - 1000 * 60 * 60); // 1 hour before
    const endDate = new Date(firstSnapshotDate.getTime() + 1000 * 60 * 60); // 1 hour after
    const dateFilteredSnapshots =
      await api.functional.ecommerceMall.seller.refund_request_snapshots.index(
        sellerConnection,
        {
          body: {
            startDate: startDate.toISOString() as string &
              tags.Format<"date-time">,
            endDate: endDate.toISOString() as string & tags.Format<"date-time">,
          },
        },
      );
    typia.assert(dateFilteredSnapshots);
    // Verify all returned snapshots are within date range
    for (const snapshot of dateFilteredSnapshots.data) {
      const snapshotDate = new Date(snapshot.created_at);
      TestValidator.predicate(
        "snapshot within date range",
        snapshotDate >= startDate && snapshotDate <= endDate,
      );
    }
  }
}
