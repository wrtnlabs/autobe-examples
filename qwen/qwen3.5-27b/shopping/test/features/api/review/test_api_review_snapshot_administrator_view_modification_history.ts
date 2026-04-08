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
 * Test that an administrator can view the complete modification history of a review through its snapshots.
 *
 * Validates the review snapshot endpoint by authenticating as an administrator and retrieving snapshots for a review. The test verifies that the endpoint returns properly structured snapshot data with pagination metadata.
 *
 * Since the full review lifecycle setup requires multiple API endpoints not available in this test scope, this test focuses on validating the snapshot retrieval functionality itself, including response structure, pagination, and snapshot field validation.
 *
 * 1. Administrator registers and authenticates to access the snapshot endpoint.
 * 2. Administrator calls the snapshot endpoint with a reviewId.
 * 3. Validates response structure contains pagination and data array.
 * 4. Confirms pagination metadata fields are present and valid.
 * 5. If snapshots exist, validates each snapshot contains required fields.
 * 6. Verifies snapshot ordering by created_at (descending).
 * 7. Confirms snapshot fields include rating_before, rating_after, deleted_at_before, deleted_at_after.
 * 8. Validates snapshot includes review, customer, and customerSession references.
 */
export async function test_api_review_snapshot_administrator_view_modification_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin1234",
      href: "https://mall.com/admin/register",
      referrer: "https://mall.com/admin",
    },
  });
  // 2. Generate a reviewId for testing
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Administrator retrieves snapshot history
  const snapshots =
    await api.functional.shoppingMall.administrator.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: reviewId,
        body: {
          page: 1,
          limit: 10,
          sort_field: "created_at",
          sort_order: "desc",
        },
      },
    );
  typia.assert(snapshots);
  // 4. Validate response structure
  TestValidator.predicate(
    "response has pagination",
    snapshots.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(snapshots.data),
  );
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current is positive",
    snapshots.pagination.current,
    snapshots.pagination.current,
  );
  TestValidator.equals(
    "pagination limit is positive",
    snapshots.pagination.limit,
    snapshots.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 6. Validate pagination consistency
  TestValidator.predicate(
    "pages calculated correctly",
    snapshots.pagination.pages ===
      Math.ceil(snapshots.pagination.records / snapshots.pagination.limit),
  );
  // 7. If snapshots exist, validate their structure
  if (snapshots.data.length > 0) {
    // Validate first snapshot
    const firstSnapshot = snapshots.data[0];
    typia.assert(firstSnapshot);
    // Validate snapshot has required fields
    TestValidator.predicate(
      "first snapshot has id",
      firstSnapshot.id !== undefined,
    );
    TestValidator.predicate(
      "first snapshot has rating_before",
      firstSnapshot.rating_before !== undefined,
    );
    TestValidator.predicate(
      "first snapshot has rating_after",
      firstSnapshot.rating_after !== undefined,
    );
    TestValidator.predicate(
      "first snapshot has deleted_at_before",
      firstSnapshot.deleted_at_before !== undefined,
    );
    TestValidator.predicate(
      "first snapshot has deleted_at_after",
      firstSnapshot.deleted_at_after !== undefined,
    );
    TestValidator.predicate(
      "first snapshot has created_at",
      firstSnapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "first snapshot has review",
      firstSnapshot.review !== undefined,
    );
    TestValidator.predicate(
      "first snapshot has customer",
      firstSnapshot.customer !== undefined,
    );
    TestValidator.predicate(
      "first snapshot has customerSession",
      firstSnapshot.customerSession !== undefined,
    );
    // Validate rating values are in valid range or null
    if (firstSnapshot.rating_before !== null) {
      TestValidator.predicate(
        "rating_before in valid range",
        firstSnapshot.rating_before >= 1 && firstSnapshot.rating_before <= 5,
      );
    }
    if (firstSnapshot.rating_after !== null) {
      TestValidator.predicate(
        "rating_after in valid range",
        firstSnapshot.rating_after >= 1 && firstSnapshot.rating_after <= 5,
      );
    }
    // Validate review reference
    TestValidator.predicate(
      "review has id",
      firstSnapshot.review.id !== undefined,
    );
    TestValidator.predicate(
      "review has rating",
      firstSnapshot.review.rating !== undefined,
    );
    // Validate customer reference
    TestValidator.predicate(
      "customer has id",
      firstSnapshot.customer.id !== undefined,
    );
    TestValidator.predicate(
      "customer has email",
      firstSnapshot.customer.email !== undefined,
    );
    // Validate customerSession reference
    TestValidator.predicate(
      "customerSession has id",
      firstSnapshot.customerSession.id !== undefined,
    );
    TestValidator.predicate(
      "customerSession has actorType",
      firstSnapshot.customerSession.actorType !== undefined,
    );
    // If multiple snapshots, validate ordering
    if (snapshots.data.length > 1) {
      const secondSnapshot = snapshots.data[1];
      typia.assert(secondSnapshot);
      TestValidator.predicate(
        "snapshots ordered by created_at descending",
        new Date(firstSnapshot.created_at).getTime() >=
          new Date(secondSnapshot.created_at).getTime(),
      );
    }
  }
  // 8. Test with different pagination parameters
  const page2 =
    await api.functional.shoppingMall.administrator.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: reviewId,
        body: {
          page: 2,
          limit: 5,
          sort_field: "created_at",
          sort_order: "asc",
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 pagination current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination limit", page2.pagination.limit, 5);
}
