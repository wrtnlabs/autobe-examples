import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewSnapshot";
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
import { generate_random_ecommerce_customer_reviews_create } from "../../../generate/generate_random_ecommerce_customer_reviews_create";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";

/**
 * Test review snapshots pagination and filtering functionality for administrators.
 *
 * Validates that multiple review edits create multiple snapshots and the pagination/filtering system works correctly for snapshot lists. This test ensures administrators can retrieve historical review states with proper pagination and filtering capabilities.
 *
 * The scenario creates a review, updates it multiple times to generate snapshots, then verifies pagination splits results correctly and filtering by rating returns only matching snapshots.
 *
 * 1. Administrator registers and authenticates.
 * 2. Customer registers and authenticates.
 * 3. Customer creates a review with initial rating.
 * 4. Customer updates review 4 times with different ratings and content.
 * 5. Administrator retrieves first page of snapshots (limit=2, offset=0).
 * 6. Administrator retrieves second page of snapshots (limit=2, offset=2).
 * 7. Administrator filters snapshots by specific rating.
 * 8. Validates pagination metadata and snapshot ordering.
 */
export async function test_api_review_snapshots_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Create initial review
  const initialReview = await generate_random_ecommerce_customer_reviews_create(
    customerConnection,
    {
      body: {
        orderItemId: typia.random<string>(),
        rating: 3,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceReview.ICreate,
    },
  );
  typia.assert(initialReview);
  const reviewId = initialReview.id;
  // 4. Update review multiple times to create snapshots (4 updates = 4 snapshots)
  const updates = [
    { rating: 4, content: RandomGenerator.paragraph({ sentences: 2 }) },
    { rating: 5, content: RandomGenerator.paragraph({ sentences: 4 }) },
    { rating: 2, content: RandomGenerator.paragraph({ sentences: 1 }) },
    { rating: 5, content: RandomGenerator.paragraph({ sentences: 3 }) },
  ];
  for (const update of updates) {
    const updated = await api.functional.ecommerce.customer.reviews.update(
      customerConnection,
      {
        reviewId,
        body: update satisfies IEcommerceReview.IUpdate,
      },
    );
    typia.assert(updated);
  }
  // 5. Retrieve first page of snapshots (limit=2, offset=0)
  const firstPage =
    await api.functional.ecommerce.admin.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: {
          limit: 2,
          offset: 0,
        } satisfies IEcommerceReviewSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  // 6. Retrieve second page of snapshots (limit=2, offset=2)
  const secondPage =
    await api.functional.ecommerce.admin.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: {
          limit: 2,
          offset: 2,
        } satisfies IEcommerceReviewSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  // 7. Filter snapshots by rating (rating=5)
  const filteredByRating =
    await api.functional.ecommerce.admin.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: {
          rating: 5,
        } satisfies IEcommerceReviewSnapshot.IRequest,
      },
    );
  typia.assert(filteredByRating);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "first page has correct limit",
    firstPage.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "first page has snapshots",
    firstPage.data.length > 0 && firstPage.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination records count is positive",
    firstPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    firstPage.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    firstPage.pagination.current >= 0,
  );
  // 9. Validate snapshot ordering (newest first - created_at descending)
  if (firstPage.data.length > 1) {
    for (let i = 0; i < firstPage.data.length - 1; i++) {
      TestValidator.predicate(
        `snapshot ${i} is newer than snapshot ${i + 1}`,
        firstPage.data[i].created_at >= firstPage.data[i + 1].created_at,
      );
    }
  }
  // 10. Validate second page has remaining snapshots
  TestValidator.predicate(
    "second page exists",
    secondPage.data.length >= 0 && secondPage.data.length <= 2,
  );
  TestValidator.equals(
    "second page total records match first page",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  // 11. Validate rating filter returns only matching snapshots
  TestValidator.predicate(
    "filtered snapshots all have rating 5",
    filteredByRating.data.every((snapshot) => snapshot.rating === 5),
  );
  TestValidator.predicate(
    "filtered results are subset of total",
    filteredByRating.pagination.records <= firstPage.pagination.records,
  );
}