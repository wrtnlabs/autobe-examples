import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Test review snapshot data isolation between customers.
 * Validates that Customer B cannot access snapshots for reviews owned by Customer A.
 */
export async function test_api_review_snapshot_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A authenticates and creates a review
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customerA);
  // Create a review for Customer A (using mock order_item_id since we can't create orders)
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const review = await api.functional.ecommerceMall.customer.reviews.create(
    customerAConnection,
    {
      body: {
        order_item_id: orderItemId,
        product_id: typia.random<string & tags.Format<"uuid">>(),
        rating: RandomGenerator.pick([1, 2, 3, 4, 5]),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 2. Customer A edits their review to create snapshots
  const updatedReview =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerAConnection,
      {
        reviewId: review.id,
        body: {
          rating: RandomGenerator.pick([1, 2, 3, 4, 5]),
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // Verify snapshots were created for Customer A's review
  const customerASnapshots =
    await api.functional.ecommerceMall.customer.reviews.snapshots.index(
      customerAConnection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(customerASnapshots);
  // Customer A should have access to their own review snapshots
  TestValidator.predicate(
    "Customer A can access their own review snapshots",
    customerASnapshots.data.length > 0,
  );
  // 3. Customer B authenticates separately
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customerB);
  // 4. Customer B attempts to view snapshots for Customer A's review
  // This should return empty results or reject the request due to data isolation
  const customerBSnapshots =
    await api.functional.ecommerceMall.customer.reviews.snapshots.index(
      customerBConnection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(customerBSnapshots);
  // 5. Validate data isolation: Customer B should NOT have access to Customer A's snapshots
  TestValidator.predicate(
    "Customer B cannot access another customer's review snapshots",
    customerBSnapshots.data.length === 0,
  );
  // 6. Verify the snapshot data is properly isolated
  TestValidator.notEquals(
    "Snapshot access differs between customers",
    customerASnapshots.data.length,
    customerBSnapshots.data.length,
  );
}
