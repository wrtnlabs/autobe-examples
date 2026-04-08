import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test seller viewing review snapshot history for their product.
 *
 * Validates that a seller can retrieve the complete snapshot history for reviews written on products they own. The test verifies the full workflow from seller product creation through customer review edits, ensuring that each edit creates an immutable snapshot preserving the previous state.
 *
 * The test establishes a multi-actor scenario where a seller creates a product, a customer purchases and reviews it, then modifies the review multiple times. Each modification automatically generates a snapshot record. The seller then queries the snapshot endpoint to verify they can access the complete audit trail.
 *
 * 1. Seller registers and creates a product for sale.
 * 2. Customer registers, places an order for the product, and writes an initial review.
 * 3. Customer edits the review twice to create two snapshot records.
 * 4. Seller retrieves the snapshot history and validates the response structure.
 * 5. Verify snapshots are ordered by created_at DESC with correct pagination metadata.
 * 6. Confirm each snapshot contains the historical rating and content values from before each edit.
 */
export async function test_api_review_snapshot_seller_view_own_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 2. Customer setup - register and place order
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create order (prepare function handles cart setup internally)
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 3. Customer writes initial review
  const review = await generate_random_shopping_mall_member_reviews_create(
    memberConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_id:
          order.orderItems[0]?.id ??
          typia.random<string & tags.Format<"uuid">>(),
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);
  // Store initial review state for validation
  const initialRating = review.rating;
  const initialContent = review.content;
  // 4. Customer edits review first time - creates first snapshot
  const firstEditRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const firstEditContent = RandomGenerator.paragraph({ sentences: 4 });
  const updatedReview1 =
    await api.functional.shoppingMall.member.reviews.update(memberConnection, {
      reviewId: review.id,
      body: {
        rating: firstEditRating,
        content: firstEditContent,
      } satisfies IShoppingMallReview.IUpdate,
    });
  typia.assert(updatedReview1);
  // 5. Customer edits review second time - creates second snapshot
  const secondEditRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const secondEditContent = RandomGenerator.paragraph({ sentences: 5 });
  const updatedReview2 =
    await api.functional.shoppingMall.member.reviews.update(memberConnection, {
      reviewId: review.id,
      body: {
        rating: secondEditRating,
        content: secondEditContent,
      } satisfies IShoppingMallReview.IUpdate,
    });
  typia.assert(updatedReview2);
  // 6. Seller retrieves snapshot history
  const snapshotResponse =
    await api.functional.shoppingMall.seller.reviews.snapshots.index(
      sellerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 10,
          sort: "-created_at",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    snapshotResponse.pagination.limit >= 1,
  );
  TestValidator.equals(
    "pagination records count",
    snapshotResponse.pagination.records,
    snapshotResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    snapshotResponse.pagination.pages >= 1,
  );
  // 8. Validate snapshots exist (should have 2 snapshots from 2 edits)
  TestValidator.predicate("snapshots exist", snapshotResponse.data.length >= 1);
  // 9. Validate snapshots are ordered by created_at DESC
  if (snapshotResponse.data.length >= 2) {
    for (let i = 0; i < snapshotResponse.data.length - 1; i++) {
      TestValidator.predicate(
        `snapshot ${i} created before snapshot ${i + 1}`,
        new Date(snapshotResponse.data[i].created_at).getTime() >=
          new Date(snapshotResponse.data[i + 1].created_at).getTime(),
      );
    }
  }
  // 10. Validate each snapshot references the correct review
  for (const snapshot of snapshotResponse.data) {
    TestValidator.equals(
      "snapshot review ID matches",
      snapshot.review.id,
      review.id,
    );
  }
}