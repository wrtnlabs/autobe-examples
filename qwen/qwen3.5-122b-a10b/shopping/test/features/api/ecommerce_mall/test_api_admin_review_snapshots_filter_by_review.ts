import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
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

/**
 * Test administrator retrieves review snapshots filtered by a specific review ID.
 *
 * This test validates the admin endpoint for querying review snapshots with review_id filter.
 * The workflow includes:
 * 1. Admin authentication
 * 2. Customer authentication
 * 3. Query snapshots with review_id filter
 * 4. Validates filtered results structure and pagination
 * 5. Validates snapshot sorting by created_at descending
 *
 * Note: This test focuses on the filtering mechanism. In a full integration test,
 * review creation and editing would be performed to generate actual snapshots.
 */
export async function test_api_admin_review_snapshots_filter_by_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Generate a review ID to filter by
  // In a real scenario, this would be an actual review created and edited by a customer
  const filterReviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Query snapshots with review_id filter
  const snapshotsResponse: IPageIEcommerceMallReviewSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        body: {
          review_id: filterReviewId,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    snapshotsResponse.pagination.limit >= 1 &&
      snapshotsResponse.pagination.limit <= 100,
  );
  TestValidator.equals(
    "pagination records count",
    snapshotsResponse.pagination.records,
    snapshotsResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshotsResponse.pagination.pages >= 0,
  );
  // 6. Validate data array structure
  TestValidator.predicate(
    "data is array",
    Array.isArray(snapshotsResponse.data),
  );
  // 7. If snapshots exist, validate their structure and filtering
  if (snapshotsResponse.data.length > 0) {
    // Validate all snapshots belong to the filtered review
    await ArrayUtil.asyncForEach(snapshotsResponse.data, async (snapshot) => {
      typia.assert(snapshot);
      // All snapshots should match the filtered review_id
      TestValidator.equals(
        "snapshot review matches filter",
        snapshot.review.id,
        filterReviewId,
      );
    });
    // Validate sorting by created_at descending (newest first)
    if (snapshotsResponse.data.length > 1) {
      for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
        const current = new Date(snapshotsResponse.data[i].createdAt).getTime();
        const next = new Date(
          snapshotsResponse.data[i + 1].createdAt,
        ).getTime();
        TestValidator.predicate(
          `snapshot ${i} created_at >= snapshot ${i + 1} created_at (descending order)`,
          current >= next,
        );
      }
    }
    // Validate snapshot structure for first result
    const firstSnapshot = snapshotsResponse.data[0];
    typia.assert(firstSnapshot);
    // Validate review reference structure
    typia.assert(firstSnapshot.review);
    TestValidator.predicate(
      "review rating is valid",
      firstSnapshot.review.rating >= 1 && firstSnapshot.review.rating <= 5,
    );
    // Validate customer reference structure
    typia.assert(firstSnapshot.changedByCustomer);
    TestValidator.predicate(
      "customer email is valid",
      firstSnapshot.changedByCustomer.email !== null,
    );
  }
}