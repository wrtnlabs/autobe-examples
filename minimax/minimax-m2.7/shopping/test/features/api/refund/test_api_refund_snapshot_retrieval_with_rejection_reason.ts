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
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_refund_snapshot_retrieval_with_rejection_reason(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // Test: Retrieve refund request snapshot when seller rejects refund with rejection reason
  // This validates snapshot preserves rejection reason for dispute resolution and audit trail
  // Step 1: Admin setup - create category for products
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // Step 2: Seller setup - register, get approved, and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Approve seller
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminConnection,
    {
      body: {
        sellerId: sellerAuth.id,
        status: "approved",
      } satisfies IEcommerceMallSellerApproval.ICreate,
    },
  );
  // Seller creates product with variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Get product with variants
  const variant = product.variants[0];
  typia.assert(variant);
  // Add inventory to variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
      body: {
        operation: "restock",
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10>
        >(),
        reason: "Initial stock for testing",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // Step 3: Customer setup - register, add to cart, checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Add product to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // Prepare checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  // Confirm checkout
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: typia.random<string>(),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Step 4: Seller ships the order item
  const orderItem = order.orderItems[0];
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "TestCarrier",
        trackingNumber: "TRACK123456",
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Step 5: Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // Step 6: Get the refund request for the delivered item
  // Note: The system auto-creates refund requests for delivered items, or the
  // customer can request a refund through customer endpoints
  // Here we use the orderItem.id as the refundRequestId based on system design
  // First, set the refund request to pending status via admin update
  // Then seller can reject it
  const refundRequest =
    await api.functional.ecommerceMall.admin.refund_requests.update(
      adminConnection,
      {
        requestId: orderItem.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(refundRequest);
  // Step 7: Seller rejects refund request with rejection reason
  // Note: The reject endpoint creates an immutable snapshot
  const REJECTION_REASON =
    "Item was delivered in acceptable condition per our policy";
  const rejectedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.reject(
      sellerConnection,
      {
        requestId: refundRequest.id,
        body: {
          seller_response_reason: REJECTION_REASON,
        } satisfies IEcommerceMallRefundRequest.IReject,
      },
    );
  typia.assert(rejectedRefundRequest);
  // Validate rejection status
  TestValidator.equals(
    "refund status",
    rejectedRefundRequest.status,
    "rejected",
  );
  // Step 8: Retrieve snapshot by ID
  const snapshot = rejectedRefundRequest.refundRequestSnapshots[0];
  typia.assert(snapshot);
  const retrievedSnapshot =
    await api.functional.ecommerceMall.seller.refund_request_snapshots.at(
      sellerConnection,
      {
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // Step 9: Validate snapshot contains rejection reason
  TestValidator.equals(
    "snapshot seller_response",
    retrievedSnapshot.seller_response,
    "rejected",
  );
  TestValidator.equals(
    "snapshot seller_response_reason",
    retrievedSnapshot.seller_response_reason,
    REJECTION_REASON,
  );
  // Validate snapshot preserves other fields
  TestValidator.equals(
    "snapshot id matches",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.predicate(
    "snapshot has valid UUID format",
    /^[0-9a-f-]{36}$/i.test(retrievedSnapshot.id),
  );
  TestValidator.predicate(
    "snapshot has created_at timestamp",
    retrievedSnapshot.created_at !== undefined,
  );
}
