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
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test retrieving a paginated list of refund request snapshots for the authenticated seller.
 *
 * This test validates the primary success path where a seller can view all snapshots
 * of refund requests they have responded to (approved or rejected).
 *
 * Steps:
 * 1. Seller joins and logs in
 * 2. Seller creates product with variant and adds inventory
 * 3. Customer joins, adds to cart, checkout, and confirms delivery
 * 4. Customer creates first refund request
 * 5. Seller approves first refund request (creates approved snapshot)
 * 6. Customer creates second refund request
 * 7. Seller rejects second refund request with reason (creates rejected snapshot)
 * 8. Seller calls PATCH /seller/refund-request-snapshots with pagination
 * 9. Verify response contains both snapshots (approved and rejected)
 * 10. Verify each snapshot includes required fields
 * 11. Verify pagination metadata is correct
 */
export async function test_api_refund_request_snapshots_listing_for_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Wait for admin approval if needed (depending on system behavior)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerAuth.email.split("@")[0], // password matches email prefix for test
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(sellerLogin);
  // 2. Create product with variant and add inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 10000,
          quantity: 10,
          option_values: [{ key: "color", value: "red" }],
        },
      },
    );
  typia.assert(variant);
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerLoginConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: { operation: "restock", quantity: 10, reason: "Initial stock" },
    },
  );
  // 3. Customer joins, adds to cart, checkout, and confirms delivery
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Login as customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerAuth.email,
        password: customerAuth.email.split("@")[0],
        href: "https://test.com",
        referrer: "https://test.com",
      },
    },
  );
  typia.assert(customerLogin);
  // Add to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerLoginConnection,
      {
        body: { variant_id: variant.id, quantity: 1 },
      },
    );
  typia.assert(cartItem);
  // Checkout prepare
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerLoginConnection,
    );
  typia.assert(checkoutPrepare);
  // Confirm checkout
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerLoginConnection,
      {
        body: {
          payment_token: "test_payment_token",
          address_id: checkoutPrepare.shippingAddress?.id,
        },
      },
    );
  typia.assert(order);
  // Get order item ID for shipment
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // Seller creates shipment
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "DHL",
        trackingNumber: "TRACK123456",
      },
    },
  );
  typia.assert(shipment);
  // Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerLoginConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 4. Customer creates first refund request
  const firstRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerLoginConnection,
      {
        body: {
          status: "pending",
          order_item_id: orderItem.id,
        },
      },
    );
  typia.assert(firstRefundRequest);
  // Get the actual refund request ID from the response
  const refundRequestId = firstRefundRequest.data[0]?.id;
  if (!refundRequestId) {
    throw new Error("Refund request was not created");
  }
  // 5. Seller approves first refund request (creates approved snapshot)
  const approvedRefund =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerLoginConnection,
      {
        requestId: refundRequestId,
      },
    );
  typia.assert(approvedRefund);
  TestValidator.equals(
    "first refund status is approved",
    approvedRefund.status,
    "approved",
  );
  // Need to create another order for the second refund request scenario
  // Add to cart again
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerLoginConnection,
      {
        body: { variant_id: variant.id, quantity: 1 },
      },
    );
  typia.assert(cartItem2);
  // Checkout prepare again
  const checkoutPrepare2 =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerLoginConnection,
    );
  typia.assert(checkoutPrepare2);
  // Confirm checkout again
  const order2 =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerLoginConnection,
      {
        body: {
          payment_token: "test_payment_token_2",
          address_id: checkoutPrepare2.shippingAddress?.id,
        },
      },
    );
  typia.assert(order2);
  const orderItem2 = order2.orderItems[0];
  typia.assert(orderItem2);
  // Seller creates second shipment
  const shipment2 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerLoginConnection,
      {
        body: {
          orderId: order2.id,
          orderItemIds: [orderItem2.id],
          carrier: "FedEx",
          trackingNumber: "TRACK789012",
        },
      },
    );
  typia.assert(shipment2);
  // Customer confirms delivery
  await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
    customerLoginConnection,
    {
      orderId: order2.id,
      shipmentId: shipment2.id,
    },
  );
  // 6. Customer creates second refund request
  const secondRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerLoginConnection,
      {
        body: {
          status: "pending",
          order_item_id: orderItem2.id,
        },
      },
    );
  typia.assert(secondRefundRequest);
  const secondRefundRequestId = secondRefundRequest.data[0]?.id;
  if (!secondRefundRequestId) {
    throw new Error("Second refund request was not created");
  }
  // 7. Seller rejects second refund request with reason (creates rejected snapshot)
  const rejectedRefund =
    await api.functional.ecommerceMall.seller.refund_requests.reject(
      sellerLoginConnection,
      {
        requestId: secondRefundRequestId,
        body: {
          seller_response_reason: "Item was already used by the customer",
        },
      },
    );
  typia.assert(rejectedRefund);
  TestValidator.equals(
    "second refund status is rejected",
    rejectedRefund.status,
    "rejected",
  );
  // 8. Call PATCH /seller/refund-request-snapshots with pagination
  const snapshotsResponse =
    await api.functional.ecommerceMall.seller.refund_request_snapshots.index(
      sellerLoginConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotsResponse);
  // 9. Verify response contains both snapshots (approved and rejected)
  TestValidator.predicate(
    "has at least 2 snapshots",
    snapshotsResponse.data.length >= 2,
  );
  const approvedSnapshot = snapshotsResponse.data.find(
    (s) => s.seller_response === "approved",
  );
  const rejectedSnapshot = snapshotsResponse.data.find(
    (s) => s.seller_response === "rejected",
  );
  TestValidator.predicate(
    "has approved snapshot",
    approvedSnapshot !== undefined,
  );
  TestValidator.predicate(
    "has rejected snapshot",
    rejectedSnapshot !== undefined,
  );
  // 10. Verify each snapshot includes required fields
  if (approvedSnapshot) {
    TestValidator.predicate(
      "approved snapshot has id",
      approvedSnapshot.id.length > 0,
    );
    TestValidator.predicate(
      "approved snapshot has snapshot_reason",
      approvedSnapshot.snapshot_reason.length > 0,
    );
    TestValidator.equals(
      "approved snapshot status is approved",
      approvedSnapshot.snapshot_status,
      "approved",
    );
    TestValidator.equals(
      "seller_response is approved",
      approvedSnapshot.seller_response,
      "approved",
    );
    TestValidator.predicate(
      "approved snapshot has created_at",
      approvedSnapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "approved snapshot has customer",
      approvedSnapshot.customer !== undefined,
    );
    TestValidator.predicate(
      "approved snapshot has seller",
      approvedSnapshot.seller !== undefined,
    );
  }
  if (rejectedSnapshot) {
    TestValidator.predicate(
      "rejected snapshot has id",
      rejectedSnapshot.id.length > 0,
    );
    TestValidator.predicate(
      "rejected snapshot has snapshot_reason",
      rejectedSnapshot.snapshot_reason.length > 0,
    );
    TestValidator.equals(
      "rejected snapshot status is rejected",
      rejectedSnapshot.snapshot_status,
      "rejected",
    );
    TestValidator.equals(
      "seller_response is rejected",
      rejectedSnapshot.seller_response,
      "rejected",
    );
    TestValidator.predicate(
      "rejected snapshot has seller_response_reason",
      rejectedSnapshot.seller_response_reason !== null,
    );
    TestValidator.equals(
      "rejection reason matches",
      rejectedSnapshot.seller_response_reason,
      "Item was already used by the customer",
    );
    TestValidator.predicate(
      "rejected snapshot has created_at",
      rejectedSnapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "rejected snapshot has customer",
      rejectedSnapshot.customer !== undefined,
    );
    TestValidator.predicate(
      "rejected snapshot has seller",
      rejectedSnapshot.seller !== undefined,
    );
  }
  // 11. Verify customer and seller summary information is included
  TestValidator.predicate(
    "customer has id",
    snapshotsResponse.data[0].customer.id.length > 0,
  );
  TestValidator.predicate(
    "customer has email",
    snapshotsResponse.data[0].customer.email.length > 0,
  );
  TestValidator.predicate(
    "customer has status",
    snapshotsResponse.data[0].customer.status !== undefined,
  );
  TestValidator.predicate(
    "seller has id",
    snapshotsResponse.data[0].seller.id.length > 0,
  );
  TestValidator.predicate(
    "seller has email",
    snapshotsResponse.data[0].seller.email.length > 0,
  );
  TestValidator.predicate(
    "seller has approval_status",
    snapshotsResponse.data[0].seller.approval_status !== undefined,
  );
  // 12. Verify pagination metadata is correct
  TestValidator.predicate(
    "has pagination",
    snapshotsResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", snapshotsResponse.pagination.limit, 10);
  TestValidator.predicate(
    "records is at least 2",
    snapshotsResponse.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pages is at least 1",
    snapshotsResponse.pagination.pages >= 1,
  );
}
