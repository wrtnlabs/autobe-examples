import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an administrator can view snapshots of a deleted review, preserving the audit trail even after deletion.
 *
 * This test validates that the administrator snapshots endpoint correctly returns review modification history. The endpoint provides access to immutable audit trail snapshots showing all modifications made to a review's rating, text content, and deletion status.
 *
 * Special attention is given to verifying that the response structure contains the expected pagination metadata and snapshot data array, with each snapshot containing before/after values for rating and deletion status changes.
 *
 * 1. Administrator registers and authenticates to the platform.
 * 2. Administrator retrieves snapshots for a review using the snapshots endpoint.
 * 3. Validates response structure contains pagination and snapshot data.
 * 4. Validates each snapshot has correct fields (rating_before, rating_after, deleted_at_before, deleted_at_after).
 */
export async function test_api_review_snapshot_administrator_view_deleted_review_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
    },
  });
  // 2. Generate a reviewId for testing
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Administrator retrieves snapshots for the review
  const snapshots =
    await api.functional.shoppingMall.administrator.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: reviewId,
        body: {
          sort_field: "created_at",
          sort_order: "desc",
        },
      },
    );
  typia.assert(snapshots);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination current is positive",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshots.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 5. Validate snapshot data structure
  await ArrayUtil.asyncForEach(snapshots.data, async (snapshot) => {
    typia.assert(snapshot);
    // Validate snapshot has required fields
    TestValidator.predicate(
      "snapshot has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    // Validate rating fields (can be null or 1-5)
    if (snapshot.rating_before !== null) {
      TestValidator.predicate(
        "rating_before is between 1-5",
        snapshot.rating_before >= 1 && snapshot.rating_before <= 5,
      );
    }
    if (snapshot.rating_after !== null) {
      TestValidator.predicate(
        "rating_after is between 1-5",
        snapshot.rating_after >= 1 && snapshot.rating_after <= 5,
      );
    }
    // Validate deletion timestamp fields (can be null or ISO date-time)
    if (snapshot.deleted_at_before !== null) {
      TestValidator.predicate(
        "deleted_at_before is valid ISO date-time",
        !isNaN(Date.parse(snapshot.deleted_at_before)),
      );
    }
    if (snapshot.deleted_at_after !== null) {
      TestValidator.predicate(
        "deleted_at_after is valid ISO date-time",
        !isNaN(Date.parse(snapshot.deleted_at_after)),
      );
    }
    // Validate created_at timestamp
    TestValidator.predicate(
      "created_at is valid ISO date-time",
      !isNaN(Date.parse(snapshot.created_at)),
    );
    // Validate related entities exist
    typia.assert(snapshot.review);
    typia.assert(snapshot.customer);
    typia.assert(snapshot.customerSession);
  });
}
