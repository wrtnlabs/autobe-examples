import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseCancellationRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_cancellation_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test administrator retrieval of snapshot history for a pending post-purchase cancellation request.
 *
 * Validates the complete post-purchase cancellation request audit trail workflow including administrative setup, seller product creation, customer order placement, shipment creation, cancellation request submission, and administrative snapshot retrieval. Ensures that the snapshot history correctly captures the initial pending state when the customer submits the cancellation request.
 *
 * Special attention is given to verifying that the audit trail begins immediately upon request creation with exactly one snapshot containing status 'pending', null seller_response, null seller, the customer's cancellation reason, and accurate created_at timestamp. This validates the business requirement that all state changes are tracked from the start for dispute resolution purposes.
 *
 * 1. Administrator account is created via join for accessing admin-only endpoints.
 * 2. Seller account is created and authenticated to own the product.
 * 3. Seller creates a product with name, description, category, and base price.
 * 4. Seller creates a product variant with SKU code and option values.
 * 5. Customer account is created and authenticated to place orders.
 * 6. Customer places an order containing the seller's product variant.
 * 7. Seller creates a shipment to mark the order item as shipped (required for post-purchase cancellation eligibility).
 * 8. Customer creates a post-purchase cancellation request with a reason.
 * 9. Administrator retrieves snapshots for the cancellation request.
 * 10. Validates response contains exactly one snapshot with status 'pending', null seller_response, null seller, customer's reason, and valid created_at timestamp.
 */
export async function test_api_post_purchase_cancellation_snapshot_pending_request_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: "Color: Red, Size: Large",
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {});
  typia.assert(customerAuth);
  // 6. Customer places order
  const order = await api.functional.shoppingMall.member.orders.create(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item from the order
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 7. Seller creates shipment to mark order as shipped
  const shipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.pick([
            "FedEx",
            "UPS",
            "DHL",
            "USPS",
          ] as const),
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 8. Customer creates post-purchase cancellation request
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.create(
      customerConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem.id,
          reason: cancellationReason,
        } satisfies IShoppingMallPostPurchaseCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 9. Admin retrieves snapshots for the cancellation request
  const snapshotsResponse =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 10. Validate snapshot history
  TestValidator.equals(
    "exactly one snapshot exists",
    snapshotsResponse.data.length,
    1,
  );
  const snapshot = snapshotsResponse.data[0];
  // Validate snapshot status is pending
  TestValidator.equals(
    "snapshot status is pending",
    snapshot.status,
    "pending",
  );
  // Validate seller_response is null for initial snapshot
  TestValidator.equals(
    "seller_response is null",
    snapshot.seller_response,
    null,
  );
  // Validate seller is null for initial snapshot
  TestValidator.equals("seller is null", snapshot.seller, null);
  // Validate snapshot contains customer's cancellation reason
  TestValidator.equals(
    "snapshot reason matches request",
    snapshot.reason,
    cancellationReason,
  );
  // Validate created_at timestamp exists and is valid
  TestValidator.predicate(
    "snapshot has valid created_at",
    snapshot.created_at !== undefined &&
      snapshot.created_at !== null &&
      typeof snapshot.created_at === "string",
  );
  // Validate pagination
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records count",
    snapshotsResponse.pagination.records >= 1,
  );
}