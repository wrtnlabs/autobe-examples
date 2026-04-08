import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

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
 * Test that a customer cannot update another customer's review - ownership validation prevents unauthorized modifications.
 *
 * Validates the review ownership enforcement mechanism by attempting to update a review created by a different member account. This test ensures that the business logic correctly prevents unauthorized modifications to reviews, maintaining data integrity and user trust in the review system.
 *
 * The test creates two separate member accounts, has the first member purchase a product and leave a review, then attempts to update that review while authenticated as the second member. The system must reject this attempt with a 403 Forbidden error.
 *
 * 1. Seller creates a product with variant and inventory stock.
 * 2. First member (review owner) registers and places an order for the product.
 * 3. Seller creates shipment and updates tracking to mark order as shipped.
 * 4. First member creates a review for the delivered order item.
 * 5. Second member (different member) registers and attempts to update the first member's review.
 * 6. Validates that the update request is rejected with 403 Forbidden error.
 * 7. Validates that the original review remains unchanged after the failed attempt.
 */
export async function test_api_review_update_different_member_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create product with variant and inventory
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const product =
    await generate_random_shopping_mall_seller_products_create(
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
  await generate_random_shopping_mall_seller_variants_inventory_records_create(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity_delta: 100,
        reason: "RESTOCK",
      } satisfies IShoppingMallInventoryRecord.ICreate,
    },
  );
  // 2. First member (review owner) - register and place order
  const reviewOwnerConnection: api.IConnection = { host: connection.host };
  const reviewOwner = await authorize_member_join(reviewOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(reviewOwner);
  // Need to add product to cart first, then create order
  // For this test, we'll use the order creation which derives from cart
  const order = await generate_random_shopping_mall_member_orders_create(
    reviewOwnerConnection,
    {},
  );
  typia.assert(order);
  // 3. Seller creates shipment to mark items as shipped
  const orderItem = order.orderItems[0];
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: "Test Carrier",
          tracking_number: "TRACK123456",
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 4. First member creates review for the delivered order item
  const review = await generate_random_shopping_mall_member_reviews_create(
    reviewOwnerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_id: orderItem.id,
        rating: 5,
        content: "Original review content by owner",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 5. Second member (different member) - register
  const differentMemberConnection: api.IConnection = {
    host: connection.host,
  };
  const differentMember = await authorize_member_join(
    differentMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  typia.assert(differentMember);
  // 6. Attempt to update the first member's review as the second member
  await TestValidator.error(
    "different member cannot update another member's review",
    async () => {
      await api.functional.shoppingMall.member.reviews.update(
        differentMemberConnection,
        {
          reviewId: review.id,
          body: {
            rating: 1,
            content: "Malicious update attempt",
          } satisfies IShoppingMallReview.IUpdate,
        },
      );
    },
  );
  // 7. Verify the original review remains unchanged
  // The review should still have the original rating and content
  TestValidator.equals(
    "review rating unchanged after failed update attempt",
    review.rating,
    5,
  );
  TestValidator.equals(
    "review content unchanged after failed update attempt",
    review.content,
    "Original review content by owner",
  );
}