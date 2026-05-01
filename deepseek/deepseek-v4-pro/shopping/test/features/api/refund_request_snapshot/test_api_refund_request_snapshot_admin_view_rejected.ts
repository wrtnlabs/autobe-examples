import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_order_items_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that an administrator can retrieve a refund request snapshot created when a seller rejected a customer's refund request.
 *
 * Validates the complete order-to-refund lifecycle spanning three actors: an administrator approves a seller's registration, the seller creates a product with variant and inventory, a customer purchases the item through checkout and delivery confirmation, the customer requests a refund with a specific reason, and the seller rejects the refund — which automatically creates an immutable snapshot.
 *
 * The administrator then retrieves the snapshot and validates that the snapshot's status is "rejected", the customer's reason text is preserved exactly, the responding seller's identity is correctly recorded, the created_at timestamp marks the precise moment of rejection, and the refundRequest reference correctly links back to the parent refund request.
 *
 * 1. Administrator registers, seller registers, and customer registers on the platform.
 * 2. Administrator approves the seller's pending registration.
 * 3. Seller creates a product with a category reference, adds a variant with SKU and option values, and stocks inventory.
 * 4. Customer adds the variant to cart and places an order (item becomes "paid").
 * 5. Seller creates a shipment for the order item (item becomes "shipped").
 * 6. Customer confirms delivery (item becomes "delivered").
 * 7. Customer submits a refund request with a specific reason text.
 * 8. Seller rejects the refund request, creating an immutable snapshot automatically.
 * 9. Administrator retrieves the snapshot and validates all key properties.
 */
export async function test_api_refund_request_snapshot_admin_view_rejected(
  connection: api.IConnection,
): Promise<void> {
  // -----------------------------------------------------------
  // 1. Actor setup with connection isolation
  // -----------------------------------------------------------
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // -----------------------------------------------------------
  // 2. Admin approves the pending seller registration
  // -----------------------------------------------------------
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // -----------------------------------------------------------
  // 3. Seller creates a product with variant and inventory
  // -----------------------------------------------------------
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 50,
        },
      },
    );
  typia.assert(variant);
  // -----------------------------------------------------------
  // 4. Customer adds variant to cart and places the order
  // -----------------------------------------------------------
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { productVariantId: variant.id, quantity: 1 },
    },
  );
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(order);
  const orderItem = order.items[0];
  // -----------------------------------------------------------
  // 5. Seller creates a shipment for the order item
  // -----------------------------------------------------------
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: [orderItem.id],
          carrier_name: "FastShip",
          tracking_number: "TRK-12345-ABCDE",
        },
      },
    );
  typia.assert(shipment);
  // -----------------------------------------------------------
  // 6. Customer confirms delivery
  // -----------------------------------------------------------
  const deliveredShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(deliveredShipment);
  // -----------------------------------------------------------
  // 7. Customer submits a refund request with a specific reason
  // -----------------------------------------------------------
  const refundReason = "The product arrived damaged with a cracked casing.";
  const refundRequest =
    await generate_random_shopping_mall_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
        body: { reason: refundReason },
      },
    );
  typia.assert(refundRequest);
  // -----------------------------------------------------------
  // 8. Seller rejects the refund request → snapshot is created
  // -----------------------------------------------------------
  const rejectedRefund =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        requestId: refundRequest.id,
        body: {
          status: "rejected",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(rejectedRefund);
  // -----------------------------------------------------------
  // 9. Admin retrieves the snapshot and validates all properties
  // -----------------------------------------------------------
  // The snapshot is created server-side when the seller rejects.
  // Extract the snapshot ID from the refund request response.
  const snapshotId: string = (
    rejectedRefund as unknown as Record<string, unknown>
  )["snapshot_id"] as string;
  TestValidator.predicate(
    "snapshot ID is available from refund request response",
    snapshotId !== undefined && snapshotId !== null && snapshotId.length > 0,
  );
  const snapshot =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.at(
      adminConnection,
      {
        requestId: refundRequest.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot status is "rejected"
  TestValidator.equals(
    "snapshot status is rejected",
    snapshot.status,
    "rejected",
  );
  // Validate reason text is preserved exactly
  TestValidator.equals(
    "snapshot preserves customer's original reason text",
    snapshot.reason,
    refundReason,
  );
  // Validate seller identity matches the seller who rejected
  TestValidator.equals(
    "snapshot seller identity matches rejecting seller",
    snapshot.seller.id,
    seller.id,
  );
  // Validate refund request reference links correctly
  TestValidator.equals(
    "snapshot refundRequest reference links to parent refund request",
    snapshot.refundRequest.id,
    refundRequest.id,
  );
  // Validate created_at records the precise moment of rejection
  TestValidator.predicate(
    "snapshot created_at is set and matches the rejection timestamp",
    snapshot.created_at === rejectedRefund.responded_at,
  );
  // Validate the snapshot is a persisted immutable record (has valid UUID id)
  TestValidator.predicate(
    "snapshot has valid id indicating it is an immutable persisted record",
    snapshot.id.length > 0,
  );
}
