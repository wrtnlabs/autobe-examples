import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_customers_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_orders_items_review_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_review_snapshot_pagination_chronological(
  connection: api.IConnection,
): Promise<void> {
  // Test pagination behavior when retrieving review snapshots in chronological order.
  // Steps:
  // 1. Authenticate as customer via POST /auth/customer/join
  // 2. Create review with multiple edit operations to generate snapshots
  // 3. Call PATCH /customer/reviews/{reviewId}/snapshots with page=1, limit=2
  // 4. Verify response returns exactly 2 snapshots
  // 5. Verify pagination shows correct total records and pages
  // 6. Call with page=2, limit=2 and verify remaining snapshots
  // 7. Verify snapshots are ordered chronologically (created_at ASC)
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Seller registration (needed for order flow)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Create review via generation utility (handles order/item setup internally)
  // Need to provide params with orderId and itemId
  const review =
    await generate_random_ecommerce_mall_customer_customers_orders_items_review_create(
      customerConnection,
      {
        body: prepare_random_ecommerce_mall_review(),
        params: {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          itemId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(review);
  // 4. Edit review multiple times to create snapshots (each edit creates a snapshot)
  const reviewId = review.id;
  const editCount = 5;
  for (let i = 0; i < editCount; i++) {
    const updatedReview =
      await api.functional.ecommerceMall.customer.reviews.update(
        customerConnection,
        {
          reviewId: reviewId,
          body: {
            rating: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
            content: `Updated review content ${i + 1}`,
          } satisfies IEcommerceMallReview.IUpdate,
        },
      );
    typia.assert(updatedReview);
  }
  // 5. Test pagination - Page 1 with limit 2
  const page1Response =
    await api.functional.ecommerceMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: reviewId,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  // 6. Verify page 1 has exactly 2 snapshots
  TestValidator.equals(
    "page 1 returns 2 snapshots",
    page1Response.data.length,
    2,
  );
  // 7. Verify pagination metadata
  TestValidator.equals(
    "total records is 5",
    page1Response.pagination.records,
    editCount,
  );
  TestValidator.equals("total pages is 3", page1Response.pagination.pages, 3);
  TestValidator.equals(
    "current page is 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("limit is 2", page1Response.pagination.limit, 2);
  // 8. Test pagination - Page 2 with limit 2
  const page2Response =
    await api.functional.ecommerceMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: reviewId,
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  // 9. Verify page 2 has exactly 2 snapshots
  TestValidator.equals(
    "page 2 returns 2 snapshots",
    page2Response.data.length,
    2,
  );
  TestValidator.equals(
    "page 2 current is 2",
    page2Response.pagination.current,
    2,
  );
  // 10. Test pagination - Page 3 with limit 2 (last page)
  const page3Response =
    await api.functional.ecommerceMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: reviewId,
        body: {
          page: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page3Response);
  // 11. Verify page 3 has only 1 snapshot (remaining)
  TestValidator.equals(
    "page 3 returns 1 snapshot",
    page3Response.data.length,
    1,
  );
  TestValidator.equals(
    "page 3 current is 3",
    page3Response.pagination.current,
    3,
  );
  // 12. Verify chronological ordering (created_at ASC) across all pages
  const allSnapshots = [
    ...page1Response.data,
    ...page2Response.data,
    ...page3Response.data,
  ];
  for (let i = 1; i < allSnapshots.length; i++) {
    const prevCreatedAt = new Date(allSnapshots[i - 1].created_at).getTime();
    const currCreatedAt = new Date(allSnapshots[i].created_at).getTime();
    TestValidator.predicate(
      `snapshot ${i} created_at is after snapshot ${i - 1}`,
      currCreatedAt >= prevCreatedAt,
    );
  }
}
