import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_order_items_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Verify that a customer can successfully retrieve their own refund request snapshot after the seller rejected the refund.
 *
 * Validates the complete refund request lifecycle from product creation through seller rejection, confirming that the immutable snapshot correctly captures the customer's reason text, the "rejected" status, the responding seller's identity, and the response timestamp. The test establishes the full ownership chain — category creation, product listing, variant stock, order placement, shipping, delivery, refund request, and seller rejection — before the customer retrieves the snapshot.
 *
 * Special attention is given to verifying that snapshots remain accessible to the owning customer even after rejection, preserving the audit trail regardless of the seller's decision. The snapshot's immutability is confirmed by comparing its frozen data against the original refund request state at the time of seller response.
 *
 * 1. Administrator creates a product category for classification.
 * 2. Seller registers, creates a product under the category, adds a variant with SKU code and option values, and records positive inventory stock.
 * 3. Customer registers and places an order for the variant with a shipping address.
 * 4. Seller creates a shipment for the order, transitioning the order item to "shipped".
 * 5. Customer confirms delivery, transitioning the order item to "delivered".
 * 6. Customer submits a refund request for the delivered order item with a reason.
 * 7. Seller rejects the refund request, creating an immutable refund request snapshot.
 * 8. Customer retrieves the snapshot and validates the frozen reason, "rejected" status, seller identity, and creation timestamp.
 */
export async function test_api_refund_request_snapshot_view_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup — create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup — join, create product, variant, and inventory
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
    },
  );
  // 3. Customer setup — join and place an order
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            variant_id: variant.id,
            quantity: 1,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
      },
    },
  );
  typia.assert(order);
  const orderItem = order.items[0];
  // 4. Seller creates shipment → order item becomes "shipped"
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // 5. Customer confirms delivery → order item becomes "delivered"
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 6. Customer submits refund request
  const refundReason = RandomGenerator.paragraph({ sentences: 4 });
  const refundRequest =
    await generate_random_shopping_mall_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
        body: {
          reason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  // 7. Seller rejects the refund request — creates immutable snapshot
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
  // 8. Retrieve the snapshot from the seller's response
  //    The server includes the created snapshot at runtime
  const snapshot = (
    rejectedRefund as IShoppingMallRefundRequest & {
      snapshots?: IShoppingMallRefundRequestSnapshot[];
    }
  ).snapshots?.[0];
  if (!snapshot) {
    throw new Error(
      "Expected snapshot to be created when seller rejects the refund request",
    );
  }
  // 9. Customer retrieves the snapshot via the target endpoint
  const retrievedSnapshot =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.at(
      customerConnection,
      {
        requestId: refundRequest.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 10. Validate the snapshot contents
  TestValidator.equals("snapshot status", retrievedSnapshot.status, "rejected");
  TestValidator.equals(
    "frozen reason text",
    retrievedSnapshot.reason,
    refundReason,
  );
  TestValidator.predicate(
    "seller identity preserved",
    retrievedSnapshot.seller !== null &&
      retrievedSnapshot.seller.id === seller.id,
  );
  TestValidator.predicate(
    "created_at timestamp is set",
    retrievedSnapshot.created_at !== null &&
      retrievedSnapshot.created_at.length > 0,
  );
  TestValidator.equals(
    "parent refund request reference",
    retrievedSnapshot.refundRequest.id,
    refundRequest.id,
  );
}
