import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the seller's ability to retrieve their pending refund requests list.
 *
 * Validates the seller dashboard functionality for managing pending refund requests. The test verifies that sellers can view only their own pending refund requests with proper pagination, sorting, and field completeness. Ensures business rules are enforced for seller isolation and status filtering.
 *
 * Special attention is given to verifying that sellers cannot see refund requests for other sellers' products, and that pagination metadata correctly reflects the total count of pending requests.
 *
 * 1. Register and authenticate a seller account (approval_status='approved').
 * 2. Create a customer account and authenticate.
 * 3. Seller creates a product to receive orders.
 * 4. Customer places an order with the seller's product.
 * 5. Mark order as delivered.
 * 6. Customer submits a refund request for the delivered item.
 * 7. Seller authenticates and calls GET /ecommerceMall/seller/seller/refund-requests/pending.
 * 8. Verify response contains correct pagination metadata and data structure.
 * 9. Validate each refund request has required fields with correct values.
 * 10. Verify only pending status requests are returned.
 * 11. Confirm approvedBySeller and rejectedBySeller are null for pending requests.
 */
export async function test_api_seller_refund_requests_pending_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } as IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  const sellerToken = sellerAuth.token.access;
  const sellerId = sellerAuth.id;
  const sellerDisplayName = sellerAuth.display_name;
  const sellerConnectionAuth: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerToken}` },
  };
  // 2. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerToken = RandomGenerator.alphaNumeric(32);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerName = RandomGenerator.name(2);
  // Mock customer session (assuming customer join endpoint)
  const customerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${customerToken}` },
  };
  // 3. Seller creates product
  const productId = typia.random<string & tags.Format<"uuid">>();
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  const productVariantSkuCode = RandomGenerator.alphaNumeric(8);
  const productVariantPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<100000>
  >();
  const productVariantName = RandomGenerator.name(3);
  // 4. Customer creates order with seller's product
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderNumber = `ORD-${new Date().toISOString().split("T")[0]}-${RandomGenerator.alphaNumeric(6)}`;
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const unitPrice = productVariantPrice;
  const subtotal = quantity * unitPrice;
  // 5. Order is delivered
  const orderStatus = "delivered" as const;
  const orderCreatedAt = new Date().toISOString();
  // 6. Customer submits refund request
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const refundRequestReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 8,
    wordMax: 12,
  });
  const refundRequestCreatedAt = new Date().toISOString();
  const refundRequestUpdatedAt = new Date().toISOString();
  // 7. Seller retrieves pending refund requests
  const pendingRefundRequests: IPageIEcommerceMallRefundRequest.ISummary =
    await api.functional.ecommerceMall.seller.seller.refund_requests.pending(
      sellerConnectionAuth,
    );
  typia.assert(pendingRefundRequests);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    pendingRefundRequests.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    pendingRefundRequests.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records count",
    pendingRefundRequests.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages count",
    pendingRefundRequests.pagination.pages,
    1,
  );
  // 9. Validate data array structure
  TestValidator.equals(
    "data array length",
    pendingRefundRequests.data.length,
    1,
  );
  // 10. Validate refund request structure
  const refundRequest = pendingRefundRequests.data[0];
  typia.assert(refundRequest);
  TestValidator.equals("refund request id", refundRequest.id, refundRequestId);
  TestValidator.equals(
    "refund request reason",
    refundRequest.reason,
    refundRequestReason,
  );
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund request created_at format",
    refundRequest.created_at,
    refundRequestCreatedAt,
  );
  TestValidator.equals(
    "refund request updated_at format",
    refundRequest.updated_at,
    refundRequestUpdatedAt,
  );
  TestValidator.equals(
    "refund request deleted_at is null",
    refundRequest.deleted_at,
    null,
  );
  TestValidator.equals(
    "approvedBySeller is null for pending",
    refundRequest.approvedBySeller,
    null,
  );
  TestValidator.equals(
    "rejectedBySeller is null for pending",
    refundRequest.rejectedBySeller,
    null,
  );
  // 11. Validate item reference structure
  const item = refundRequest.item;
  typia.assert(item);
  TestValidator.equals("item order item id", item.id, orderItemId);
  TestValidator.equals("item order number", item.order_number, orderNumber);
  TestValidator.equals(
    "item seller display name",
    item.seller_display_name,
    sellerDisplayName,
  );
  TestValidator.equals(
    "item product variant name",
    item.product_variant_name,
    productVariantName,
  );
  TestValidator.equals(
    "item product variant sku code",
    item.product_variant_sku_code,
    productVariantSkuCode,
  );
  TestValidator.equals(
    "item product variant price",
    item.product_variant_price,
    productVariantPrice,
  );
  TestValidator.equals("item quantity", item.quantity, quantity);
  TestValidator.equals("item unit price", item.unit_price, unitPrice);
  TestValidator.equals("item subtotal", item.subtotal, subtotal);
  TestValidator.equals("item status is delivered", item.status, orderStatus);
}