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
 * Test seller approval of a refund request for a delivered order item.
 *
 * Follows the complete order lifecycle from product creation through delivery
 * to refund approval, validating the entire workflow. The test ensures that
 * when a seller approves a pending refund request, the request status
 * transitions correctly, the order item becomes refunded, and the order's
 * derived status is recalculated. Additionally verifies that a responded
 * request cannot be re-responded, returning a 409 Conflict.
 *
 * 1. Administrator creates a product category and approves a seller.
 * 2. Seller creates a product with a purchasable variant and adds stock.
 * 3. Customer places an order for the variant.
 * 4. Seller ships the order item, customer confirms delivery.
 * 5. Customer submits a refund request for the delivered item.
 * 6. Seller approves the refund request.
 * 7. Validates status transitions, responded_at timestamp, and order item state.
 * 8. Verifies re-response is blocked with 409 Conflict.
 */
export async function test_api_refund_request_seller_approve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 6. Seller adds inventory
  const stockQuantity: number = 10;
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      body: {
        quantity_change: stockQuantity satisfies number as number,
        reason: "Initial stock",
      },
      params: {
        productId: product.id,
        variantId: variant.id,
      },
    },
  );
  // 7. Customer places order
  const orderQuantity = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            variant_id: variant.id,
            quantity: orderQuantity satisfies number as number,
          },
        ],
      },
    },
  );
  typia.assert(order);
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // 8. Seller creates shipment (paid → shipped)
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
  // 9. Customer confirms delivery (shipped → delivered)
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    { shipmentId: shipment.id },
  );
  // 10. Customer submits refund request
  const refundRequest =
    await generate_random_shopping_mall_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
        body: {
          reason: "Item not as described",
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request starts as pending",
    refundRequest.status,
    "pending",
  );
  // 11. Seller approves refund request
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
  // 12. Validate approval results
  TestValidator.equals(
    "status transitions to approved",
    approvedRefund.status,
    "approved",
  );
  TestValidator.predicate(
    "responded_at is set after approval",
    approvedRefund.responded_at !== null,
  );
  if (approvedRefund.responded_at !== null) {
    TestValidator.predicate(
      "responded_at timestamp is recent",
      new Date(approvedRefund.responded_at).getTime() > Date.now() - 60000,
    );
  }
  TestValidator.equals(
    "order item status changes to refunded",
    approvedRefund.orderItem.status,
    "refunded",
  );
  TestValidator.equals(
    "order derived status recalculated to refunded",
    approvedRefund.orderItem.order.status,
    "refunded",
  );
  // 13. Re-responding returns 409 Conflict
  await TestValidator.error(
    "re-responding to approved refund request fails",
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.update(
        sellerConnection,
        {
          requestId: refundRequest.id,
          body: {
            status: "rejected",
          } satisfies IShoppingMallRefundRequest.IUpdate,
        },
      );
    },
  );
}
