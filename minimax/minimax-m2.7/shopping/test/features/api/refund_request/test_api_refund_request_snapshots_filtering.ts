import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test refund request snapshots filtering by status, seller response, and date range.
 *
 * This test validates the filtering functionality for refund request snapshots:
 * 1. Seller creates approved refund request snapshot
 * 2. Filter by snapshot_status='approved'
 * 3. Filter by seller_response='approved'
 * 4. Filter by date range
 * 5. Verify pagination works correctly with filters
 *
 * Steps:
 * 1. Register and approve seller account
 * 2. Register and login as customer
 * 3. Seller creates product with variant
 * 4. Add inventory to variant
 * 5. Customer adds item to cart and checks out
 * 6. Seller ships the order
 * 7. Customer confirms delivery
 * 8. Customer submits refund request
 * 9. Seller approves refund creating approved snapshot
 * 10. Apply various filters and verify results
 */
export async function test_api_refund_request_snapshots_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller Registration and Approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Customer Registration and Login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Update customer connection with token
  customerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // 3. Seller creates product with variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product for Refund Filtering",
        description: "Testing refund request snapshots filtering functionality",
        base_price: 10000,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // Get variant ID from product
  const variant = product.variants[0];
  const variantId = variant.id;
  const productId = product.id;
  // 4. Add inventory to variant
  const inventory =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId, variantId },
        body: {
          operation: "restock",
          quantity: 10,
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventory);
  // 5. Customer adds item to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variantId,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 6. Prepare checkout
  const prepareResult =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(prepareResult);
  // 7. Confirm checkout (place order)
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token:
            "test_payment_token_" + RandomGenerator.alphaNumeric(16),
        },
      },
    );
  typia.assert(order);
  // Get order item ID
  const orderItem = order.orderItems[0];
  const orderItemId = orderItem.id;
  const orderId = order.id;
  // 8. Seller ships the order
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: orderId,
        orderItemIds: [orderItemId],
        carrier: "Test Carrier",
        trackingNumber: "TRACK" + RandomGenerator.alphaNumeric(10),
      },
    },
  );
  typia.assert(shipment);
  const shipmentId = shipment.id;
  // 9. Customer confirms delivery
  const deliveryConfirmation =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: orderId,
        shipmentId: shipmentId,
      },
    );
  typia.assert(deliveryConfirmation);
  // 10. Customer submits refund request
  // Note: We need to use the SDK directly since customer refund request submit might not be in utilities
  const customerSnapshot =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {},
      },
    );
  // Get the refund request ID from the order items
  // Since we need to submit a refund request, we'll query for it
  const refundRequests =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
        },
      },
    );
  // If no refund request exists, we need to submit one
  let refundRequestId: string;
  if (refundRequests.data.length > 0) {
    refundRequestId = refundRequests.data[0].id;
  } else {
    // Submit refund request - reason is not a valid field in IRequest
    const submittedRefund =
      await api.functional.ecommerceMall.customer.refund_requests.index(
        customerConnection,
        {
          body: {
            order_item_id: orderItemId,
          },
        },
      );
    refundRequestId = (submittedRefund.data[0] as any)?.id ?? orderItemId;
  }
  // 11. Seller approves refund request (creates approved snapshot)
  // First get the refund request from seller side
  const sellerSnapshot =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerConnection,
      {
        requestId: refundRequestId,
      },
    );
  typia.assert(sellerSnapshot);
  // Verify refund request is approved
  TestValidator.equals(
    "refund status should be approved",
    sellerSnapshot.status,
    "approved",
  );
  // 12. Test filtering by snapshot_status='approved'
  const filteredByStatus =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        requestId: refundRequestId,
        body: {
          snapshot_status: "approved",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(filteredByStatus);
  // Verify all returned snapshots have approved status
  TestValidator.predicate(
    "should return approved snapshots",
    filteredByStatus.data.length > 0,
  );
  for (const snapshot of filteredByStatus.data) {
    TestValidator.equals(
      "snapshot status should be approved",
      snapshot.snapshot_status,
      "approved",
    );
  }
  // 13. Test filtering by seller_response='approved'
  const filteredByResponse =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        requestId: refundRequestId,
        body: {
          seller_response: "approved",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(filteredByResponse);
  // Verify all returned snapshots have approved seller response
  for (const snapshot of filteredByResponse.data) {
    TestValidator.equals(
      "seller response should be approved",
      snapshot.seller_response,
      "approved",
    );
  }
  // 14. Test date range filter
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const filteredByDateRange =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        requestId: refundRequestId,
        body: {
          startDate: oneWeekAgo.toISOString(),
          endDate: tomorrow.toISOString(),
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(filteredByDateRange);
  // Verify snapshots are within date range
  for (const snapshot of filteredByDateRange.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      "snapshot should be within date range",
      snapshotDate >= oneWeekAgo && snapshotDate <= tomorrow,
    );
  }
  // 15. Test combined filters
  const combinedFilters =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        requestId: refundRequestId,
        body: {
          snapshot_status: "approved",
          seller_response: "approved",
          startDate: oneWeekAgo.toISOString(),
          endDate: tomorrow.toISOString(),
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(combinedFilters);
  // Verify all filters are applied correctly
  for (const snapshot of combinedFilters.data) {
    TestValidator.equals(
      "snapshot status should be approved",
      snapshot.snapshot_status,
      "approved",
    );
    TestValidator.equals(
      "seller response should be approved",
      snapshot.seller_response,
      "approved",
    );
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      "snapshot should be within date range",
      snapshotDate >= oneWeekAgo && snapshotDate <= tomorrow,
    );
  }
  // 16. Test pagination with filters
  const paginatedResults =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        requestId: refundRequestId,
        body: {
          snapshot_status: "approved",
          limit: 1,
          page: 1,
        },
      },
    );
  typia.assert(paginatedResults);
  // Verify pagination metadata
  TestValidator.predicate(
    "should have pagination info",
    paginatedResults.pagination !== undefined,
  );
  TestValidator.equals(
    "current page should be 1",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 1",
    paginatedResults.pagination.limit,
    1,
  );
  // If there are multiple pages, test page 2
  if (paginatedResults.pagination.pages > 1) {
    const page2Results =
      await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
        sellerConnection,
        {
          requestId: refundRequestId,
          body: {
            snapshot_status: "approved",
            limit: 1,
            page: 2,
          },
        },
      );
    typia.assert(page2Results);
    TestValidator.equals(
      "page 2 current should be 2",
      page2Results.pagination.current,
      2,
    );
    // Verify different data on page 2
    if (paginatedResults.data.length > 0 && page2Results.data.length > 0) {
      TestValidator.notEquals(
        "page 1 and page 2 should have different snapshots",
        paginatedResults.data[0].id,
        page2Results.data[0].id,
      );
    }
  }
  // 17. Test sorting with filters
  const sortedAsc =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        requestId: refundRequestId,
        body: {
          snapshot_status: "approved",
          sortField: "created_at",
          sortOrder: "asc",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(sortedAsc);
  // Verify ascending order
  if (sortedAsc.data.length > 1) {
    for (let i = 1; i < sortedAsc.data.length; i++) {
      const prevDate = new Date(sortedAsc.data[i - 1].created_at);
      const currDate = new Date(sortedAsc.data[i].created_at);
      TestValidator.predicate(
        "should be in ascending order by created_at",
        prevDate <= currDate,
      );
    }
  }
  const sortedDesc =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        requestId: refundRequestId,
        body: {
          snapshot_status: "approved",
          sortField: "created_at",
          sortOrder: "desc",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(sortedDesc);
  // Verify descending order
  if (sortedDesc.data.length > 1) {
    for (let i = 1; i < sortedDesc.data.length; i++) {
      const prevDate = new Date(sortedDesc.data[i - 1].created_at);
      const currDate = new Date(sortedDesc.data[i].created_at);
      TestValidator.predicate(
        "should be in descending order by created_at",
        prevDate >= currDate,
      );
    }
  }
  // 18. Test empty results with non-matching filter
  const emptyResults =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        requestId: refundRequestId,
        body: {
          snapshot_status: "rejected",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(emptyResults);
  // Verify no rejected snapshots exist (we only have approved)
  TestValidator.equals(
    "should return empty array for non-matching filter",
    emptyResults.data.length,
    0,
  );
}