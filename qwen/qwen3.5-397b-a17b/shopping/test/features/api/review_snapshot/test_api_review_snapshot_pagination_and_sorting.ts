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
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test review snapshot pagination and sorting functionality.
 *
 * Validates that review snapshot retrieval supports pagination with correct sorting order. The test creates a member account, establishes an order with delivered items, creates a review, and performs 5 updates to generate snapshot history. Pagination is tested across 3 pages with limit=2 to verify correct item counts, metadata accuracy, and DESC sorting by created_at.
 *
 * The test ensures that snapshots are returned in chronological order (newest first) across all pagination boundaries, enabling efficient browsing of long edit histories.
 *
 * 1. Member account created and authenticated via authorize_member_join.
 * 2. Order created with delivered order item for review eligibility.
 * 3. Initial review created for the delivered order item.
 * 4. Review updated 5 times with varying ratings and content to create snapshots.
 * 5. Pagination tested across 3 pages (limit=2): page 1 returns 2, page 2 returns 2, page 3 returns 1.
 * 6. Pagination metadata validated: total records=5, total pages=3.
 * 7. Sorting verified: snapshots ordered by created_at DESC across all pages.
 */
export async function test_api_review_snapshot_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Create order with delivered order item (prerequisite for review)
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // Get first order item and simulate delivery status
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order item exists", orderItem !== undefined);
  TestValidator.equals(
    "order item status delivered",
    orderItem.status,
    "delivered",
  );
  // 3. Create initial review
  const review = await api.functional.shoppingMall.member.reviews.create(
    memberConnection,
    {
      body: {
        shopping_mall_product_id: orderItem.product.id,
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_id: orderItem.id,
        rating: 3,
        content: "Initial review content",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 4. Update review 5 times to create 5 snapshots
  const updateRatings = [5, 4, 5, 2, 4] as const;
  const updateContents = [
    "First update - excellent product",
    "Second update - good value",
    "Third update - highly recommend",
    "Fourth update - some issues found",
    "Fifth update - overall satisfied",
  ] as const;
  for (let i = 0; i < 5; i++) {
    const updatedReview =
      await api.functional.shoppingMall.member.reviews.update(
        memberConnection,
        {
          reviewId: review.id,
          body: {
            rating: updateRatings[i],
            content: updateContents[i],
          } satisfies IShoppingMallReview.IUpdate,
        },
      );
    typia.assert(updatedReview);
  }
  // 5-10. Test pagination across 3 pages with limit=2
  const page1 =
    await api.functional.shoppingMall.member.reviews.snapshots.index(
      memberConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 2,
          sort: "-created_at",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  const page2 =
    await api.functional.shoppingMall.member.reviews.snapshots.index(
      memberConnection,
      {
        reviewId: review.id,
        body: {
          page: 2,
          limit: 2,
          sort: "-created_at",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  const page3 =
    await api.functional.shoppingMall.member.reviews.snapshots.index(
      memberConnection,
      {
        reviewId: review.id,
        body: {
          page: 3,
          limit: 2,
          sort: "-created_at",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page3);
  // 11. Validate pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.equals("page 1 records", page1.pagination.records, 5);
  TestValidator.equals("page 1 pages", page1.pagination.pages, 3);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
  TestValidator.equals("page 2 records", page2.pagination.records, 5);
  TestValidator.equals("page 2 pages", page2.pagination.pages, 3);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3.pagination.limit, 2);
  TestValidator.equals("page 3 records", page3.pagination.records, 5);
  TestValidator.equals("page 3 pages", page3.pagination.pages, 3);
  // Validate item counts per page
  TestValidator.equals("page 1 items count", page1.data.length, 2);
  TestValidator.equals("page 2 items count", page2.data.length, 2);
  TestValidator.equals("page 3 items count", page3.data.length, 1);
  // 12. Validate sorting order (created_at DESC across pages)
  const allSnapshots = [...page1.data, ...page2.data, ...page3.data];
  TestValidator.equals("total snapshots", allSnapshots.length, 5);
  // Verify DESC order: each snapshot's created_at should be >= next snapshot's
  for (let i = 0; i < allSnapshots.length - 1; i++) {
    const current = allSnapshots[i].created_at;
    const next = allSnapshots[i + 1].created_at;
    TestValidator.predicate(
      `snapshot ${i} >= snapshot ${i + 1} (DESC order)`,
      current >= next,
    );
  }
  // Verify ratings match update sequence (newest first: 4, 2, 5, 4, 5)
  const expectedRatings = [4, 2, 5, 4, 5];
  for (let i = 0; i < 5; i++) {
    TestValidator.equals(
      `snapshot ${i} rating`,
      allSnapshots[i].rating,
      expectedRatings[i],
    );
  }
}
