import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
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

export async function test_api_review_snapshot_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer and admin connections
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Customer creates a review using utility function
  // This creates the review and potentially initial snapshot history
  const review =
    await generate_random_ecommerce_mall_customer_reviews_create(
      customerConnection,
    );
  typia.assert(review);
  // Step 3: Admin queries all snapshots to establish baseline
  const allSnapshotsResponse =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 100,
          createdAtFrom: null,
          createdAtTo: null,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshotsResponse);
  // Step 4: Test date range filtering with future date that should return no results
  const now = new Date();
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const futureFilterResponse =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 100,
          createdAtFrom: farFuture.toISOString(),
          createdAtTo: null,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(futureFilterResponse);
  // Validate that future date filter returns empty results
  TestValidator.equals(
    "future date filter should return empty results",
    futureFilterResponse.data.length,
    0,
  );
  // Step 5: Test with past date range that should include all snapshots
  const farPast = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const pastFilterResponse =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 100,
          createdAtFrom: farPast.toISOString(),
          createdAtTo: null,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(pastFilterResponse);
  // Validate that past date filter returns all snapshots
  TestValidator.equals(
    "past date filter should return all snapshots",
    pastFilterResponse.data.length,
    allSnapshotsResponse.data.length,
  );
  // Step 6: Test with specific date range (createdAtFrom and createdAtTo)
  const recentPast = new Date(now.getTime() - 60 * 1000);
  const nearFuture = new Date(now.getTime() + 60 * 1000);
  const rangeFilterResponse =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 100,
          createdAtFrom: recentPast.toISOString(),
          createdAtTo: nearFuture.toISOString(),
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(rangeFilterResponse);
  // Validate that the date range filter returns appropriate results
  // All snapshots should be within the time range since they were just created
  TestValidator.predicate(
    "range filter results should be within specified date range",
    rangeFilterResponse.data.every((snapshot) => {
      const snapshotDate = new Date(snapshot.createdAt);
      return snapshotDate >= recentPast && snapshotDate <= nearFuture;
    }),
  );
}
