import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test administrator pagination when viewing refund request snapshots.
 *
 * **Setup Sequence**:
 * 1. Authenticate as admin using POST /auth/admin/join
 * 2. Authenticate as seller using POST /auth/seller/join
 * 3. Authenticate as customer using POST /auth/customer/join
 * 4. Create product with variant and inventory
 * 5. Create shipping address
 * 6. Place order and confirm delivery
 * 7. Customer submits first refund request
 * 8. Seller rejects first refund (creates first snapshot)
 * 9. Customer submits second refund request for same delivered item
 * 10. Seller approves second refund (creates second snapshot)
 *
 * **Test Execution**:
 * - Call PATCH /admin/refund-requests/{requestId}/snapshots with:
 *   - page: 1, limit: 1
 *   - sortOrder: "desc" (default - newest first)
 * - Verify response contains only 1 snapshot
 * - Verify pagination shows total records >= 2
 * - Verify pages indicates more than 1 page available
 * - Call with page: 2 to get second page of results
 * - Verify different snapshot returned on page 2
 * - Verify same snapshot ordering on both pages
 *
 * **Validation Points**:
 * - Pagination limit correctly restricts page size to requested value
 * - Page calculation works correctly: offset = (page - 1) * limit
 * - Total record count accurately reflects all available snapshots
 * - Page navigation returns correct offset results
 * - Results maintain consistent sort order across pages
 */
export async function test_api_admin_refund_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 3. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 4. Create product with variant and inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: [{ key: "size", value: "Large" }],
        },
      },
    );
  typia.assert(variant);
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: { operation: "restock", quantity: 10, reason: "Initial stock" },
    },
  );
  // 5. Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 6. Add to cart, checkout, and place order
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: { variant_id: variant.id, quantity: 1 },
      },
    );
  typia.assert(cartItem);
  // Prepare checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  // Confirm order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "mock_payment_token",
          address_id: address.id,
        },
      },
    );
  typia.assert(order);
  // Get order details to find order item
  const orderDetails = await api.functional.ecommerceMall.customer.orders.at(
    customerConnection,
    { orderId: order.id },
  );
  typia.assert(orderDetails);
  const orderItemId = orderDetails.order_items[0].id;
  // Ship order item
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItemId],
        carrier: "DHL",
        trackingNumber: "1234567890",
      },
    },
  );
  typia.assert(shipment);
  // Confirm delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { orderId: order.id, shipmentId: shipment.id },
    );
  typia.assert(confirmedShipment);
  // 7. Customer submits first refund request
  const firstRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          status: "pending",
        },
      },
    );
  typia.assert(firstRefundRequest);
  // Create the first refund request
  const firstRefund =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(firstRefund);
  // Find the pending refund request for this order item
  const pendingRefund = firstRefund.data.find(
    (r) => r.orderItem.id === orderItemId && r.status === "pending",
  );
  if (!pendingRefund) {
    throw new Error("Pending refund request not found");
  }
  // 8. Seller rejects first refund (creates first snapshot)
  const rejectedRefund =
    await api.functional.ecommerceMall.seller.refund_requests.reject(
      sellerConnection,
      {
        requestId: pendingRefund.id,
        body: {
          seller_response_reason: "Item was delivered in good condition",
        },
      },
    );
  typia.assert(rejectedRefund);
  // 9. Customer submits second refund request for same delivered item
  const secondRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          status: "pending",
        },
      },
    );
  typia.assert(secondRefundRequest);
  // Find the new pending refund request
  const secondPendingRefund = secondRefundRequest.data.find(
    (r) => r.orderItem.id === orderItemId && r.status === "pending",
  );
  if (!secondPendingRefund) {
    throw new Error("Second pending refund request not found");
  }
  // 10. Seller approves second refund (creates second snapshot)
  const approvedRefund =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerConnection,
      { requestId: secondPendingRefund.id },
    );
  typia.assert(approvedRefund);
  // Test pagination with admin
  // Get first page with limit 1
  const firstPage =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        requestId: secondPendingRefund.id,
        body: {
          page: 1,
          limit: 1,
          sortOrder: "desc",
        },
      },
    );
  typia.assert(firstPage);
  // Verify first page has exactly 1 snapshot
  TestValidator.equals("page 1 has exactly 1 record", firstPage.data.length, 1);
  // Verify total records >= 2 (at least 2 snapshots: reject + approve)
  TestValidator.predicate(
    "total records >= 2",
    firstPage.pagination.records >= 2,
  );
  // Verify pages > 1 (pagination available)
  TestValidator.predicate(
    "pages > 1 for pagination",
    firstPage.pagination.pages > 1,
  );
  // Store first page snapshot for comparison
  const firstPageSnapshotId = firstPage.data[0].id;
  const firstPageSnapshotCreatedAt = firstPage.data[0].created_at;
  // Get second page with limit 1
  const secondPage =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        requestId: secondPendingRefund.id,
        body: {
          page: 2,
          limit: 1,
          sortOrder: "desc",
        },
      },
    );
  typia.assert(secondPage);
  // Verify second page has exactly 1 snapshot
  TestValidator.equals(
    "page 2 has exactly 1 record",
    secondPage.data.length,
    1,
  );
  // Verify different snapshot on page 2
  TestValidator.notEquals(
    "page 2 has different snapshot than page 1",
    secondPage.data[0].id,
    firstPageSnapshotId,
  );
  // Verify consistent sort order (page 1 should have newer snapshot)
  TestValidator.predicate(
    "page 1 snapshot is newer than page 2 (desc order)",
    firstPageSnapshotCreatedAt > secondPage.data[0].created_at,
  );
  // Test page 1 again to verify consistency
  const firstPageAgain =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        requestId: secondPendingRefund.id,
        body: {
          page: 1,
          limit: 1,
          sortOrder: "desc",
        },
      },
    );
  typia.assert(firstPageAgain);
  // Verify same snapshot returned on repeated request
  TestValidator.equals(
    "page 1 returns same snapshot on repeated request",
    firstPageAgain.data[0].id,
    firstPageSnapshotId,
  );
  // Verify limit is respected (limit: 1 should return max 1 item)
  TestValidator.equals(
    "limit 1 returns max 1 record",
    firstPage.pagination.limit,
    1,
  );
  // Verify pagination metadata is accurate
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.equals(
    "second page current is 2",
    secondPage.pagination.current,
    2,
  );
}
