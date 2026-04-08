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
 * Test successful retrieval of an active product review by its UUID identifier.
 *
 * Validates the complete review retrieval flow including all prerequisite setup: member and seller account creation, seller approval, product and variant creation, inventory stocking, order placement, shipment creation, and review creation. Ensures that the review endpoint returns complete review data with all nested relations properly populated.
 *
 * Special attention is given to verifying that all nested objects (member, product, order, orderItem) contain the expected fields and that the review data accurately reflects the submitted rating and content. The endpoint is public (no authentication required) and only returns non-deleted reviews.
 *
 * 1. Member account created for review author.
 * 2. Seller account created and approved by admin.
 * 3. Product created by seller with variant and inventory.
 * 4. Member places order for the product variant.
 * 5. Seller creates shipment for order items.
 * 6. Member creates review for order item (system handles delivery verification).
 * 7. Retrieve review by ID and validate all fields.
 */
export async function test_api_review_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate credentials upfront to reuse for login
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create member account (review author)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Submit seller approval request
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  // 4. Create admin account and approve seller
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      grade: "regular",
    },
  });
  // Approve seller
  const approvedRequest =
    await api.functional.shoppingMall.admin.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: { status: "approved" },
      },
    );
  typia.assert(approvedRequest);
  // 5. Seller creates product
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 6. Create product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 7. Stock inventory
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      { params: { variantId: variant.id } },
    );
  typia.assert(inventoryRecord);
  // 8. Member places order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(order);
  // 9. Get order items for shipment
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 10. Seller creates shipment
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.name(2),
          tracking_number: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(shipment);
  // 11. Member creates review for order item
  // Note: In production, this would require order item to be delivered
  // For E2E testing, we assume the test environment allows review creation
  const reviewRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const reviewContent = RandomGenerator.paragraph({ sentences: 3 });
  const review = await generate_random_shopping_mall_member_reviews_create(
    memberConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_id: orderItem.id,
        rating: reviewRating,
        content: reviewContent,
      },
    },
  );
  typia.assert(review);
  // 12. Retrieve review by ID (public endpoint - no auth needed)
  const retrievedReview = await api.functional.shoppingMall.reviews.at(
    connection,
    {
      reviewId: review.id,
    },
  );
  typia.assert(retrievedReview);
  // 13. Validate review data
  TestValidator.equals("review id matches", retrievedReview.id, review.id);
  TestValidator.equals(
    "member email matches",
    retrievedReview.member.email,
    memberEmail,
  );
  TestValidator.equals(
    "product id matches",
    retrievedReview.product.id,
    product.id,
  );
  TestValidator.equals("order id matches", retrievedReview.order.id, order.id);
  TestValidator.equals(
    "order item id matches",
    retrievedReview.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals("rating matches", retrievedReview.rating, reviewRating);
  TestValidator.equals(
    "content matches",
    retrievedReview.content,
    reviewContent,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedReview.deleted_at === null,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedReview.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedReview.updated_at !== undefined,
  );
  // 14. Validate nested relations
  TestValidator.predicate(
    "member has email",
    retrievedReview.member.email !== undefined,
  );
  TestValidator.predicate(
    "product has name",
    retrievedReview.product.name !== undefined,
  );
  TestValidator.predicate(
    "product has base_price",
    retrievedReview.product.base_price !== undefined,
  );
  TestValidator.predicate(
    "order has code",
    retrievedReview.order.code !== undefined,
  );
  TestValidator.predicate(
    "orderItem has quantity",
    retrievedReview.orderItem.quantity !== undefined,
  );
  TestValidator.predicate(
    "orderItem has price",
    retrievedReview.orderItem.price !== undefined,
  );
}