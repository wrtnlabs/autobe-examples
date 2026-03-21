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
 * Test cross-seller authorization for refund request snapshots.
 *
 * This test validates that a seller cannot access refund request snapshots
 * belonging to another seller. The authorization boundary ensures sellers
 * can only access snapshots related to their own products.
 *
 * Steps:
 * 1. Register and approve Seller A and Seller B accounts
 * 2. Register and authenticate as customer
 * 3. Create product under Seller A and another product under Seller B
 * 4. Customer purchases both products and both are delivered
 * 5. Customer submits refund requests for both products
 * 6. Seller A approves their refund request (creates snapshot)
 * 7. Seller B approves their refund request (creates snapshot)
 * 8. Seller A attempts to call the target endpoint with Seller B's refund request ID
 * 9. Verify the request is rejected with authorization error indicating access denied
 * 10. Verify Seller A can successfully retrieve snapshots for their own refund request
 */
export async function test_api_refund_request_snapshots_cross_seller_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate Seller A
  const sellerACredentials = {
    email: `seller_a_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test.com/seller-a",
    referrer: "https://test.com",
  };
  const sellerASession = await authorize_seller_join(
    { host: connection.host },
    { body: sellerACredentials },
  );
  const sellerAConnection: api.IConnection = { host: connection.host };
  sellerAConnection.headers = { Authorization: sellerASession.token.access };
  // Step 2: Register and authenticate Seller B
  const sellerBCredentials = {
    email: `seller_b_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test.com/seller-b",
    referrer: "https://test.com",
  };
  const sellerBSession = await authorize_seller_join(
    { host: connection.host },
    { body: sellerBCredentials },
  );
  const sellerBConnection: api.IConnection = { host: connection.host };
  sellerBConnection.headers = { Authorization: sellerBSession.token.access };
  // Step 3: Register and authenticate Customer
  const customerCredentials = {
    email: `customer_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test.com/customer",
    referrer: "https://test.com",
  };
  const customerSession = await authorize_customer_join(
    { host: connection.host },
    { body: customerCredentials },
  );
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: customerSession.token.access };
  // Step 4: Create product under Seller A
  const productA = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: `SellerA Product ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<number & tags.Minimum<1000>>() satisfies number as number,
      },
    },
  );
  // Get the first variant of product A
  const variantA = productA.variants[0];
  // Add inventory to Seller A's variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerAConnection,
    {
      params: { productId: productA.id, variantId: variantA.id },
      body: {
        operation: "restock",
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        reason: "Initial stock for testing",
      },
    },
  );
  // Step 5: Create product under Seller B
  const productB = await generate_random_ecommerce_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: `SellerB Product ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<number & tags.Minimum<1000>>() satisfies number as number,
      },
    },
  );
  // Get the first variant of product B
  const variantB = productB.variants[0];
  // Add inventory to Seller B's variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerBConnection,
    {
      params: { productId: productB.id, variantId: variantB.id },
      body: {
        operation: "restock",
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        reason: "Initial stock for testing",
      },
    },
  );
  // Step 6: Customer adds both products to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variantA.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      },
    },
  );
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variantB.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      },
    },
  );
  // Step 7: Customer prepares checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  // Step 8: Customer confirms order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: `payment_token_${RandomGenerator.alphaNumeric(16)}`,
        },
      },
    );
  typia.assert(order);
  // Get order items - first item from Seller A, second from Seller B
  const orderItemA = order.orderItems.find(
    (item) => item.productSnapshot.name === productA.name,
  )!;
  const orderItemB = order.orderItems.find(
    (item) => item.productSnapshot.name === productB.name,
  )!;
  TestValidator.equals("order should have 2 items", order.orderItems.length, 2);
  // Step 9: Create shipments for both sellers
  const shipmentA =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerAConnection,
      {
        body: {
          orderId: order.id,
          orderItemIds: [orderItemA.id],
          carrier: "TestCarrier",
          trackingNumber: `TRACK${RandomGenerator.alphaNumeric(8)}`,
        },
      },
    );
  typia.assert(shipmentA);
  const shipmentB =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerBConnection,
      {
        body: {
          orderId: order.id,
          orderItemIds: [orderItemB.id],
          carrier: "TestCarrier",
          trackingNumber: `TRACK${RandomGenerator.alphaNumeric(8)}`,
        },
      },
    );
  typia.assert(shipmentB);
  // Step 10: Customer confirms delivery for both shipments
  await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipmentA.id,
    },
  );
  await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipmentB.id,
    },
  );
  // Step 11: Customer submits refund requests for both products
  // Using the PATCH endpoint to create/list refund requests
  const refundRequests =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(refundRequests);
  // Find refund request for product A and product B
  const refundRequestA = refundRequests.data.find(
    (req) => req.orderItem.id === orderItemA.id,
  )!;
  const refundRequestB = refundRequests.data.find(
    (req) => req.orderItem.id === orderItemB.id,
  )!;
  TestValidator.equals(
    "should have refund requests for both products",
    refundRequests.data.length,
    2,
  );
  // Step 12: Seller B approves their refund request (creates snapshot)
  const approvedRefundB =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerBConnection,
      {
        requestId: refundRequestB.id,
      },
    );
  typia.assert(approvedRefundB);
  // Step 13: Seller A approves their refund request (creates snapshot)
  const approvedRefundA =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerAConnection,
      {
        requestId: refundRequestA.id,
      },
    );
  typia.assert(approvedRefundA);
  // Step 14: Seller A attempts to access Seller B's refund request snapshots
  // This should be rejected with authorization error
  await TestValidator.error(
    "Seller A cannot access Seller B's refund request snapshots",
    async () => {
      await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
        sellerAConnection,
        {
          requestId: refundRequestB.id,
          body: {},
        },
      );
    },
  );
  // Step 15: Verify Seller A can successfully retrieve their own refund request snapshots
  const ownSnapshots =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerAConnection,
      {
        requestId: refundRequestA.id,
        body: {},
      },
    );
  typia.assert(ownSnapshots);
  TestValidator.equals(
    "Seller A should see their own refund request snapshots",
    ownSnapshots.data.length > 0,
    true,
  );
  // Step 16: Verify Seller B can successfully retrieve their own refund request snapshots
  const sellerBSnapshots =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerBConnection,
      {
        requestId: refundRequestB.id,
        body: {},
      },
    );
  typia.assert(sellerBSnapshots);
  TestValidator.equals(
    "Seller B should see their own refund request snapshots",
    sellerBSnapshots.data.length > 0,
    true,
  );
  // Step 17: Verify the snapshots have correct data
  const snapshotA = ownSnapshots.data[0];
  TestValidator.equals(
    "Snapshot should have 'approved' seller_response",
    snapshotA.seller_response,
    "approved",
  );
  TestValidator.equals(
    "Snapshot should have 'approved' snapshot_status",
    snapshotA.snapshot_status,
    "approved",
  );
  const snapshotB = sellerBSnapshots.data[0];
  TestValidator.equals(
    "Snapshot should have 'approved' seller_response",
    snapshotB.seller_response,
    "approved",
  );
  TestValidator.equals(
    "Snapshot should have 'approved' snapshot_status",
    snapshotB.snapshot_status,
    "approved",
  );
}