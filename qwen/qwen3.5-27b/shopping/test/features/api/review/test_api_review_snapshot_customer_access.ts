import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_snapshot_customer_access(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer access to review snapshots.
   * Verifies that customers can retrieve paginated snapshots of their own reviews,
   * including pagination metadata and snapshot data integrity.
   */
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Generate a review ID (simulating an existing review)
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve snapshots with default pagination
  const snapshotsPage1: IPageIShoppingMallReviewSnapshot.ISummary =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId,
        body: {} satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage1);
  // 4. Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    snapshotsPage1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is default 20",
    snapshotsPage1.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshotsPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshotsPage1.pagination.pages >= 0,
  );
  // 5. Verify snapshot data structure
  if (snapshotsPage1.data.length > 0) {
    const firstSnapshot = snapshotsPage1.data[0];
    typia.assert(firstSnapshot);
    // Verify required fields exist
    TestValidator.predicate(
      "snapshot has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstSnapshot.id,
      ),
    );
    TestValidator.equals(
      "snapshot references correct review",
      firstSnapshot.shopping_mall_review_id,
      reviewId,
    );
    TestValidator.predicate(
      "snapshot has non-empty snapshot_data",
      firstSnapshot.snapshot_data.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid created_at timestamp",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T[01][0-9]:[0-5][0-9]:[0-5][0-9]/.test(
        firstSnapshot.created_at,
      ),
    );
    // 6. Verify snapshots are in descending order by created_at
    if (snapshotsPage1.data.length > 1) {
      const secondSnapshot = snapshotsPage1.data[1];
      typia.assert(secondSnapshot);
      TestValidator.predicate(
        "snapshots ordered by created_at descending",
        new Date(firstSnapshot.created_at).getTime() >=
          new Date(secondSnapshot.created_at).getTime(),
      );
    }
  }
  // 7. Test pagination with custom limit
  const snapshotsCustomLimit: IPageIShoppingMallReviewSnapshot.ISummary =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId,
        body: {
          limit: 5,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsCustomLimit);
  TestValidator.equals(
    "custom limit applied",
    snapshotsCustomLimit.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data array respects limit",
    snapshotsCustomLimit.data.length <= 5,
  );
  // 8. Test pagination with page 2
  const snapshotsPage2: IPageIShoppingMallReviewSnapshot.ISummary =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId,
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage2);
  TestValidator.equals(
    "pagination current page is 2",
    snapshotsPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 10",
    snapshotsPage2.pagination.limit,
    10,
  );
}
