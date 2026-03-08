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
 * Test customer review snapshot pagination and sorting functionality.
 *
 * Validates:
 * 1. Customer authentication and review creation
 * 2. Multiple review edits create snapshots
 * 3. Snapshots are sorted by created_at descending (newest first)
 * 4. Pagination metadata is accurate (total count, current page, total pages)
 * 5. Pagination respects limit parameter
 * 6. Can navigate through multiple pages
 */
export async function test_api_review_snapshot_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create initial review
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review);
  // 3. Edit review multiple times to create snapshots (at least 3 edits)
  const edits = ArrayUtil.repeat(3, (index) => ({
    rating: ((index % 5) + 1) satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    content: `Edited review content ${index + 1} - ${RandomGenerator.paragraph({ sentences: 3 })}`,
  }));
  for (const edit of edits) {
    const updated = await api.functional.ecommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: edit satisfies IEcommerceMallReview.IUpdate,
      },
    );
    typia.assert(updated);
  }
  // 4. Test pagination with limit=2 (to create multiple pages with 4 snapshots)
  const page1 =
    await api.functional.ecommerceMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // 5. Verify pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.predicate("page 1 has records", page1.pagination.records > 0);
  TestValidator.predicate("page 1 has pages", page1.pagination.pages > 0);
  // 6. Verify sorting (newest first - created_at descending)
  if (page1.data.length > 1) {
    for (let i = 0; i < page1.data.length - 1; i++) {
      const current = new Date(page1.data[i].createdAt).getTime();
      const next = new Date(page1.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `snapshot ${i} is newer than snapshot ${i + 1}`,
        current >= next,
      );
    }
  }
  // 7. Test second page
  const page2 =
    await api.functional.ecommerceMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
  TestValidator.equals(
    "page 2 total records",
    page2.pagination.records,
    page1.pagination.records,
  );
  // 8. Verify total count across pages
  const totalSnapshots = page1.pagination.records;
  TestValidator.equals(
    "total snapshots from page 1",
    totalSnapshots,
    page1.data.length + (page2.data?.length || 0),
  );
  // 9. Test with different limit (limit=100)
  const allSnapshots =
    await api.functional.ecommerceMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.equals(
    "all snapshots current page",
    allSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "all snapshots limit",
    allSnapshots.pagination.limit,
    100,
  );
  TestValidator.equals(
    "all snapshots total matches",
    allSnapshots.pagination.records,
    totalSnapshots,
  );
  TestValidator.equals(
    "all snapshots page count",
    allSnapshots.pagination.pages,
    1,
  );
  // 10. Verify all snapshots are present
  TestValidator.equals(
    "all snapshots data count",
    allSnapshots.data.length,
    totalSnapshots,
  );
  // 11. Verify snapshot structure
  for (const snapshot of allSnapshots.data) {
    TestValidator.predicate("snapshot has id", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot has review",
      snapshot.review.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has changedByCustomer",
      snapshot.changedByCustomer.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot has previousValues",
      snapshot.previousValues !== null,
    );
    TestValidator.predicate(
      "snapshot has currentValues",
      snapshot.currentValues !== null,
    );
  }
  // 12. Verify customer owns the snapshots
  for (const snapshot of allSnapshots.data) {
    TestValidator.equals(
      "snapshot customer matches",
      snapshot.changedByCustomer.id,
      customer.id,
    );
  }
}
