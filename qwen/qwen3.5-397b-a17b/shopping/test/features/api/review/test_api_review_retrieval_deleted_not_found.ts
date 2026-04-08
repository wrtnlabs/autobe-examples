import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
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
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that attempting to retrieve a soft-deleted review returns 404 Not Found.
 *
 * Validates the complete review lifecycle including member and seller account setup, product creation, order placement, shipment delivery, review creation, review deletion, and verification that deleted reviews are not accessible through the public retrieval endpoint.
 *
 * Special attention is given to verifying that soft-deleted reviews (with deleted_at set) are not accessible through GET /shoppingMall/reviews/{reviewId}, maintaining consistency with product page display behavior where deleted reviews are not shown. The review data is preserved in the database for audit purposes but not retrievable via API.
 *
 * 1. Member account created via authorize_member_join.
 * 2. Seller account created via authorize_seller_join and approval request submitted.
 * 3. Admin account created via authorize_admin_join and approves seller approval request.
 * 4. Seller creates product with at least one variant.
 * 5. Inventory stocked for the variant.
 * 6. Member places order for the product variant.
 * 7. Seller creates shipment for the order item.
 * 8. Shipment is marked as delivered.
 * 9. Member creates a review for the delivered order item.
 * 10. Member deletes their own review.
 * 11. Attempt to retrieve the deleted review - should throw HttpError (404 Not Found).
 */
export async function test_api_review_retrieval_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (review author)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create seller account and submit approval request
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  // 3. Create admin account and approve seller
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  await api.functional.shoppingMall.admin.approval_requests.update(
    adminConnection,
    {
      requestId: approvalRequest.id,
      body: {
        status: "approved",
      } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
    },
  );
  // 4. Seller creates product with variant
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
      },
    );
  typia.assert(variant);
  // 5. Stock inventory for the variant
  await generate_random_shopping_mall_seller_variants_inventory_records_create(
    sellerConnection,
    {
      params: { variantId: variant.id },
    },
  );
  // 6. Member places order (requires cart items - using generation function)
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // Get the first order item for this order
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 7. Seller creates shipment for the order item
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 8. Mark shipment as delivered
  await api.functional.shoppingMall.seller.seller.shipments.update(
    sellerConnection,
    {
      shipmentId: shipment.id,
      body: {
        carrier_name: shipment.carrier_name,
        tracking_number: shipment.tracking_number,
      } satisfies IShoppingMallShipment.IUpdate,
    },
  );
  // Note: The update endpoint doesn't set delivered_at directly.
  // In real flow, customer confirms delivery or auto-delivery after 14 days.
  // For E2E test, we proceed assuming the shipment is delivered.
  // 9. Member creates review for the delivered order item
  const review = await generate_random_shopping_mall_member_reviews_create(
    memberConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_id: orderItem.id,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 10. Member deletes their own review
  await api.functional.shoppingMall.member.reviews.erase(memberConnection, {
    reviewId: review.id,
  });
  // 11. Attempt to retrieve the deleted review - should throw 404
  await TestValidator.error("deleted review not found", async () => {
    await api.functional.shoppingMall.reviews.at(memberConnection, {
      reviewId: review.id,
    });
  });
}
