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

export async function test_api_refund_request_snapshots_seller_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and approve seller account with active selling privileges
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://test.com/seller",
      referrer: "https://test.com",
    },
  });
  // Login as seller
  await api.functional.ecommerceMall.auth.seller.login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://test.com/seller",
      referrer: "https://test.com",
    },
  });
  // Step 2: Register a customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();
  await api.functional.ecommerceMall.auth.customer.join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://test.com/customer",
      referrer: "https://test.com",
    },
  });
  // Step 3: Create a product with a variant and inventory under the approved seller
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Add inventory to the product variant
  const variant = product.variants[0];
  await api.functional.ecommerceMall.seller.products.variants.inventory.create(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      body: {
        operation: "restock" as const,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        reason: "Initial stock",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // Step 4: Customer adds the variant to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Step 5: Customer prepares checkout and confirms order
  await api.functional.ecommerceMall.customer.checkout.prepare(
    customerConnection,
  );
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token_success",
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Step 6: Seller creates shipment for the order item
  const orderItem = order.orderItems[0];
  const shipment = await api.functional.ecommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "DHL",
        trackingNumber: "1234567890",
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Step 7: Customer confirms delivery of the order item
  await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  // Step 8: Customer submits a refund request for the delivered order item with a reason
  const refundReason = RandomGenerator.paragraph({ sentences: 2 });
  const customerId = cartItem.cart.customer.id;
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason_keyword: refundReason.substring(0, 20),
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequest);
  // Step 9: Seller approves the refund request (this creates a snapshot)
  const pendingRefund = refundRequest.data[0];
  const approvedRefund =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerConnection,
      {
        requestId: pendingRefund.id,
      },
    );
  typia.assert(approvedRefund);
  // Step 10: Seller calls the target endpoint to retrieve refund request snapshots
  const snapshotPage =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        requestId: pendingRefund.id,
        body: {
          page: 1,
          limit: 10,
          sortOrder: "desc",
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // Step 11: Verify the response contains the snapshot with correct reason text, status at snapshot time, and seller response
  TestValidator.equals(
    "has snapshots data",
    snapshotPage.data.length > 0,
    true,
  );
  const snapshot = snapshotPage.data[0];
  TestValidator.equals(
    "snapshot reason matches",
    snapshot.snapshot_reason,
    refundReason,
  );
  TestValidator.equals(
    "snapshot status is approved",
    snapshot.snapshot_status,
    "approved",
  );
  TestValidator.equals(
    "seller response is approved",
    snapshot.seller_response,
    "approved",
  );
  // Step 12: Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current is 1",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    snapshotPage.pagination.limit,
    10,
  );
  TestValidator.predicate("has records", snapshotPage.pagination.records >= 1);
  // Step 13: Verify ordering is reverse chronological (newest first)
  if (snapshotPage.data.length > 1) {
    for (let i = 0; i < snapshotPage.data.length - 1; i++) {
      const currentTime = new Date(snapshotPage.data[i].created_at).getTime();
      const nextTime = new Date(snapshotPage.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "snapshots ordered newest first",
        currentTime >= nextTime,
      );
    }
  }
  // Step 14: Verify the snapshot contains customer information and refund request details
  TestValidator.equals("has customer info", snapshot.customer !== null, true);
  TestValidator.equals("customer id matches", snapshot.customer.id, customerId);
  TestValidator.equals(
    "has refund request info",
    snapshot.refundRequest !== null,
    true,
  );
  TestValidator.equals(
    "refund request id matches",
    snapshot.refundRequest.id,
    pendingRefund.id,
  );
  TestValidator.equals("has seller info", snapshot.seller !== null, true);
}
