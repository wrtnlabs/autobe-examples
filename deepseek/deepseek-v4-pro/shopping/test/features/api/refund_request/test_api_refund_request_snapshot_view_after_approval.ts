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
 * Test retrieval of a refund request snapshot after seller approval.
 *
 * Validates the complete refund workflow from product setup through snapshot retrieval. An administrator creates a product category, a seller registers and creates a product with a variant and inventory stock, and a customer places an order for that variant. The seller then ships the order, the customer confirms delivery, and the customer submits a refund request. When the seller approves the refund, an immutable snapshot is created capturing the customer's reason, the "approved" status, the responding seller's identity, and the response timestamp.
 *
 * The test then calls the target endpoint as the customer to retrieve the snapshot and validates that it contains the expected frozen data: status is "approved", the reason text matches the original refund request, the seller field identifies the responding seller, and the snapshot belongs to the correct parent refund request.
 *
 * 1. Administrator joins and creates a product category.
 * 2. Seller joins, creates a product under the category, adds a variant with SKU and option values, and records positive inventory stock.
 * 3. Customer joins and places an order for the variant with a shipping address.
 * 4. Seller creates a shipment for the order, transitioning the order item to "shipped".
 * 5. Customer confirms delivery, transitioning the order item to "delivered".
 * 6. Customer submits a refund request for the delivered order item with a reason.
 * 7. Seller approves the refund request, creating an immutable snapshot.
 * 8. Customer retrieves the snapshot via the target endpoint and validates its contents.
 */
export async function test_api_refund_request_snapshot_view_after_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup - creates product, variant, inventory
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: {
        quantity_change: 100,
        reason: "Initial stock for E2E test",
      },
    },
  );
  // 3. Customer setup - places order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
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
  typia.assert(orderItem);
  // 4. Seller creates shipment
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: { orderItemIds: [orderItem.id] },
      },
    );
  typia.assert(shipment);
  // 5. Customer confirms delivery
  const deliveredShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(deliveredShipment);
  // 6. Customer submits refund request
  const refundRequest =
    await generate_random_shopping_mall_customer_order_items_refund_requests_create(
      customerConnection,
      { params: { itemId: orderItem.id } },
    );
  typia.assert(refundRequest);
  // 7. Seller approves refund request
  const approvedRefund =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        requestId: refundRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approvedRefund);
  // 8. Customer retrieves the snapshot
  const approvedData = JSON.parse(JSON.stringify(approvedRefund)) as {
    snapshots?: Array<{
      id: string;
    }>;
  };
  const snapshotId = approvedData.snapshots?.[0]?.id;
  if (snapshotId === undefined) {
    throw new Error(
      "Snapshot was not found in the approved refund request response",
    );
  }
  const snapshot =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.at(
      customerConnection,
      { requestId: refundRequest.id, snapshotId },
    );
  typia.assert(snapshot);
  // Validate snapshot contents
  TestValidator.equals(
    "snapshot status is approved",
    snapshot.status,
    "approved",
  );
  TestValidator.equals(
    "snapshot reason matches original refund request",
    snapshot.reason,
    refundRequest.reason,
  );
  TestValidator.predicate(
    "snapshot references the responding seller",
    snapshot.seller.id === seller.id,
  );
  TestValidator.equals(
    "snapshot belongs to correct refund request",
    snapshot.refundRequest.id,
    refundRequest.id,
  );
}
