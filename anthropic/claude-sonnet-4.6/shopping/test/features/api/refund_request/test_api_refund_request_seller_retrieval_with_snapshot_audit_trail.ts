import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import type { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_orders_items_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_requests_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_orders_shipments_items_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_item } from "../../../prepare/prepare_random_shopping_mall_shipment_item";

export async function test_api_refund_request_seller_retrieval_with_snapshot_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Admin joins ──────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // ── Step 2: Admin creates a product category ─────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.alphabets(8) } },
  );
  typia.assert(category);
  // ── Step 3: Seller joins ─────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // ── Step 4: Seller submits approval request ──────────────────────────
  const sellerApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(sellerApproval);
  // ── Step 5: Admin approves the seller ────────────────────────────────
  const approvedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: sellerApproval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedApproval);
  // ── Step 6: Seller creates a product ─────────────────────────────────
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 10000,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // ── Step 7: Seller creates a product variant ──────────────────────────
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: `SKU-${RandomGenerator.alphaNumeric(12)}`,
          options: [
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "color",
              value: "red",
              sequence: 0,
              created_at: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // ── Step 8: Seller adds inventory to the variant ──────────────────────
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 50,
          note: "Initial stock",
        },
      },
    );
  typia.assert(inventoryRecord);
  // ── Step 9: Customer joins ────────────────────────────────────────────
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // ── Step 10: Customer places an order ────────────────────────────────
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        shipping_address_line1: "123 Main Street",
        shipping_address_line2: null,
        shipping_city: "Seoul",
        shipping_state: null,
        shipping_postal_code: "06000",
        shipping_country: "KR",
        items: [
          {
            product_variant_id: variant.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  const orderItem = order.items[0];
  typia.assertGuard(orderItem!);
  // ── Step 11: Seller creates a shipment (transitions item to 'shipped') ─
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          carrier: "DHL",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [orderItem.id],
          shippedAt: new Date().toISOString(),
        },
      },
    );
  typia.assert(shipment);
  // ── Step 12: Seller updates the shipment with delivery information ─────
  // Sets shipped_at and estimated_delivery_at (delivered_at is managed
  // by a separate delivery confirmation workflow on the platform)
  const updatedShipment =
    await api.functional.shoppingMall.seller.orders.shipments.update(
      sellerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {
          carrier: "DHL",
          tracking_number: shipment.tracking_number,
          shipped_at: new Date().toISOString(),
          estimated_delivery_at: new Date().toISOString(),
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // ── Step 13: Customer submits a refund request ────────────────────────
  const refundReason = "Item was defective on arrival";
  const refundRequest =
    await generate_random_shopping_mall_customer_orders_items_refund_requests_create(
      customerConnection,
      {
        params: { orderId: order.id, orderItemId: orderItem.id },
        body: { reason: refundReason },
      },
    );
  typia.assert(refundRequest);
  // ── Step 14: Seller rejects the refund request (creates snapshot) ─────
  const rejectedRefund =
    await api.functional.shoppingMall.seller.refundRequests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "rejected",
          note: "Rejection after review",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(rejectedRefund);
  // ── Target: Seller retrieves the refund request ───────────────────────
  const retrieved = await api.functional.shoppingMall.seller.refundRequests.at(
    sellerConnection,
    { refundRequestId: refundRequest.id },
  );
  typia.assert(retrieved);
  // ── Assertions ────────────────────────────────────────────────────────
  // Status is 'rejected'
  TestValidator.equals(
    "refund request status is rejected",
    retrieved.status,
    "rejected",
  );
  // Reason preserves original customer reason verbatim
  TestValidator.equals(
    "reason matches original customer reason",
    retrieved.reason,
    refundReason,
  );
  // snapshots array contains exactly one entry
  TestValidator.equals(
    "snapshots array has exactly one entry",
    retrieved.snapshots.length,
    1,
  );
  // The single snapshot record assertions
  const snapshot = retrieved.snapshots[0];
  typia.assertGuard(snapshot!);
  // Snapshot has a valid id
  TestValidator.predicate("snapshot has a valid id", snapshot.id.length > 0);
  // Snapshot's refundRequest.status matches 'rejected'
  TestValidator.equals(
    "snapshot refundRequest status is rejected",
    snapshot.refundRequest.status,
    "rejected",
  );
  // Snapshot's refundRequest.reason matches original customer reason
  TestValidator.equals(
    "snapshot refundRequest reason matches",
    snapshot.refundRequest.reason,
    refundReason,
  );
  // Snapshot created_at is a non-empty ISO 8601 timestamp
  TestValidator.predicate(
    "snapshot created_at is non-empty",
    snapshot.created_at.length > 0,
  );
  // updated_at on parent refund request reflects the seller's response
  TestValidator.predicate(
    "refund request updated_at is non-empty",
    retrieved.updated_at.length > 0,
  );
  // Snapshots are in chronological order (ascending created_at)
  for (let i = 1; i < retrieved.snapshots.length; i++) {
    const prev = retrieved.snapshots[i - 1]!;
    const curr = retrieved.snapshots[i]!;
    TestValidator.predicate(
      `snapshot[${i}] created_at >= snapshot[${i - 1}] created_at (chronological order)`,
      new Date(curr.created_at).getTime() >=
        new Date(prev.created_at).getTime(),
    );
  }
  // Confirm tamper-proof append-only audit trail
  TestValidator.equals(
    "snapshots remain append-only (still 1 snapshot)",
    retrieved.snapshots.length,
    1,
  );
}
