import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Test administrator can filter review snapshots by customer ID for audit purposes.
 *
 * This test verifies:
 * 1. Admin authenticates via /ecommerceMall/auth/admin/join
 * 2. Customer authenticates and creates multiple reviews across different products
 * 3. Customer edits some reviews to generate snapshots
 * 4. Admin requests snapshots with customer_id filter parameter
 * 5. Response returns only snapshots where changed_by_customer_id matches the specified customer
 * 6. Each snapshot shows which customer made the change (changedByCustomer reference)
 * 7. Pagination works correctly with filtered results
 * 8. Date range filtering can be combined with customer_id filter
 */
export async function test_api_admin_review_snapshots_filter_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string & tags.Format<"email"> as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Customer setup - authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Create multiple reviews across different products
  const reviews: IEcommerceMallReview[] = [];
  await ArrayUtil.asyncRepeat(3, async (index) => {
    const review = await api.functional.ecommerceMall.customer.reviews.create(
      customerConnection,
      {
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          product_id: typia.random<string & tags.Format<"uuid">>(),
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 + index }),
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
    typia.assert(review);
    reviews.push(review);
  });
  // 4. Edit some reviews to generate snapshots (edit first 2 reviews)
  const updatedReviewIds: string[] = [];
  await ArrayUtil.asyncRepeat(2, async (index) => {
    const review = reviews[index];
    const updated = await api.functional.ecommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 5 + index }),
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
    typia.assert(updated);
    updatedReviewIds.push(review.id);
  });
  // 5. Request snapshots with customer_id filter parameter
  const snapshots =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        body: {
          customer_id: customer.id,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Verify response returns only snapshots for the specified customer
  TestValidator.equals(
    "all snapshots belong to filtered customer",
    snapshots.data.every(
      (snapshot) => snapshot.changedByCustomer.id === customer.id,
    ),
    true,
  );
  // 7. Verify each snapshot shows which customer made the change
  await ArrayUtil.asyncForEach(snapshots.data, async (snapshot) => {
    TestValidator.equals(
      "snapshot changedByCustomer matches filtered customer",
      snapshot.changedByCustomer.id,
      customer.id,
    );
    TestValidator.equals(
      "snapshot changedByCustomer email matches",
      snapshot.changedByCustomer.email,
      customer.email,
    );
  });
  // 8. Verify pagination works correctly with filtered results
  TestValidator.equals(
    "pagination current page is 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    snapshots.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count is positive",
    snapshots.pagination.records > 0,
  );
  // 9. Test date range filtering combined with customer_id filter
  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7); // 7 days ago
  const future = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 1 day in future
  const filteredByDate =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        body: {
          customer_id: customer.id,
          created_at_from: past.toISOString(),
          created_at_to: future.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(filteredByDate);
  // Verify all snapshots are within date range
  await ArrayUtil.asyncForEach(filteredByDate.data, async (snapshot) => {
    const snapshotDate = new Date(snapshot.createdAt);
    TestValidator.predicate(
      "snapshot created_at is within date range",
      snapshotDate >= past && snapshotDate <= future,
    );
  });
  // Verify date filtering returns subset or equal to customer filter
  TestValidator.predicate(
    "date-filtered results <= customer-filtered results",
    filteredByDate.data.length <= snapshots.data.length,
  );
}