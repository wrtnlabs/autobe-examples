import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
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
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_refund_snapshot_retrieval_by_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account with pending status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const sellerEmail = sellerAuth.email;
  const sellerPassword = "Test1234!";
  // 2. Admin approves the seller
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminConnection,
    {
      body: {
        sellerId: sellerAuth.id,
        status: "approved",
      } satisfies IEcommerceMallSellerApproval.ICreate,
    },
  );
  // Re-login as approved seller
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/login",
      referrer: "https://example.com/",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Register a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  const customerEmail = customerAuth.email;
  // 4. Seller creates a product with variants and inventory
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  // Get the product's first variant
  const variant = product.variants[0];
  const variantId = variant.id;
  const productId = product.id;
  // Add inventory to the variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId, variantId },
      body: {
        operation: "restock",
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        reason: "Initial stock for testing",
      },
    },
  );
  // 5. Customer adds item to cart and places an order
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variantId,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      },
    },
  );
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token:
            "mock_payment_token_" + RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Get the order item
  const orderItem = order.orderItems[0];
  const orderItemId = orderItem.id;
  const orderId = order.id;
  // 6. Seller ships the order and customer confirms delivery
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: orderId,
        orderItemIds: [orderItemId],
        carrier: "TestCarrier",
        trackingNumber: "TRACK" + RandomGenerator.alphaNumeric(10),
      },
    },
  );
  await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: orderId,
      shipmentId: shipment.id,
    },
  );
  // 7. Customer submits a refund request for the delivered order item
  const refundReason = "Product quality not as expected";
  const refundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          order_item_id: orderItemId,
          status: "pending",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  // Get the pending refund request ID
  const pendingRefund = refundRequest.data[0];
  const refundRequestId = pendingRefund.id;
  // 8. Seller approves the refund request (this creates the snapshot)
  const approvedRefund =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerConnection,
      {
        requestId: refundRequestId,
      },
    );
  typia.assert(approvedRefund);
  // Get the snapshot ID from the approved refund request
  const snapshot = approvedRefund.refundRequestSnapshots[0];
  const snapshotId = snapshot.id;
  // 9. Seller retrieves the refund request snapshot by snapshotId
  const retrievedSnapshot =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.at(
      sellerConnection,
      {
        requestId: refundRequestId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(retrievedSnapshot);
  // Validations
  TestValidator.equals(
    "snapshot has correct refundRequestId",
    retrievedSnapshot.refundRequest.id,
    refundRequestId,
  );
  TestValidator.equals(
    "snapshot has correct snapshotReason",
    retrievedSnapshot.snapshotReason,
    refundReason,
  );
  TestValidator.equals(
    "snapshot has snapshotStatus approved",
    retrievedSnapshot.snapshotStatus,
    "approved",
  );
  TestValidator.equals(
    "snapshot has sellerResponse approved",
    retrievedSnapshot.sellerResponse,
    "approved",
  );
  TestValidator.equals(
    "sellerResponseReason is null",
    retrievedSnapshot.sellerResponseReason,
    null,
  );
  TestValidator.predicate(
    "createdAt is set",
    retrievedSnapshot.createdAt !== null &&
      retrievedSnapshot.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt is set",
    retrievedSnapshot.updatedAt !== null &&
      retrievedSnapshot.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "refundRequest is included",
    retrievedSnapshot.refundRequest !== null &&
      retrievedSnapshot.refundRequest !== undefined,
  );
  TestValidator.predicate(
    "customer is included",
    retrievedSnapshot.customer !== null &&
      retrievedSnapshot.customer !== undefined,
  );
  TestValidator.predicate(
    "seller is included",
    retrievedSnapshot.seller !== null && retrievedSnapshot.seller !== undefined,
  );
  TestValidator.equals(
    "refundRequest status is approved",
    retrievedSnapshot.refundRequest.status,
    "approved",
  );
  TestValidator.equals(
    "customer email matches",
    retrievedSnapshot.customer.email,
    customerEmail,
  );
  TestValidator.equals(
    "seller id matches the approved seller",
    retrievedSnapshot.seller.id,
    sellerAuth.id,
  );
}
