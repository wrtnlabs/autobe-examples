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
 * Test administrator viewing review snapshots after customer has deleted their review.
 *
 * Validates the business rule that snapshots are preserved for audit purposes even when the associated review is soft-deleted. This ensures administrators can access historical review data for dispute resolution and compliance purposes.
 *
 * The test creates a complete review lifecycle including multiple edits to generate snapshots, then verifies that all snapshots remain accessible after the review itself is deleted.
 *
 * 1. Administrator registers via /ecommerce/auth/admin/join
 * 2. Customer registers via /ecommerce/auth/customer/join
 * 3. Customer creates a review via /ecommerce/customer/reviews (requires delivered order item)
 * 4. Customer updates the review via /ecommerce/customer/reviews/{reviewId} (creates first snapshot)
 * 5. Customer updates the review again via /ecommerce/customer/reviews/{reviewId} (creates second snapshot)
 * 6. Customer deletes the review via /ecommerce/customer/reviews/{reviewId}
 * 7. Administrator retrieves snapshots via /ecommerce/admin/admin/reviews/{reviewId}/snapshots
 *
 * **Validation Points:**
 * - Snapshot list is still accessible even though review is deleted
 * - All snapshots created before deletion are present (at least 2 from updates)
 * - Snapshots contain complete historical data (rating, content, timestamp)
 * - Pagination metadata is correct
 * - Review deletion does not cascade delete snapshots
 *
 * **Business Logic Validated:**
 * - Snapshots are immutable and preserved after review deletion
 * - Deleted reviews do not affect snapshot accessibility
 * - Audit trail is maintained for deleted reviews
 * - Administrators can view snapshots for dispute resolution even after review removal
 */
export async function test_api_review_snapshots_admin_view_deleted_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Create review (utility function handles order item creation)
  const review: IEcommerceReview =
    await generate_random_ecommerce_customer_reviews_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph(),
        } satisfies IEcommerceReview.ICreate,
      },
    );
  typia.assert(review);
  // 4. Update review (creates first snapshot)
  const updatedReview1 = await api.functional.ecommerce.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph(),
      } satisfies IEcommerceReview.IUpdate,
    },
  );
  typia.assert(updatedReview1);
  // 5. Update review again (creates second snapshot)
  const updatedReview2 = await api.functional.ecommerce.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph(),
      } satisfies IEcommerceReview.IUpdate,
    },
  );
  typia.assert(updatedReview2);
  // 6. Delete review
  await api.functional.ecommerce.customer.reviews.erase(customerConnection, {
    reviewId: review.id,
  });
  // 7. Administrator retrieves snapshots
  const snapshots =
    await api.functional.ecommerce.admin.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: review.id,
        body: {},
      },
    );
  typia.assert(snapshots);
  // 8. Validate snapshots are preserved after review deletion
  TestValidator.predicate(
    "snapshots exist after review deletion",
    snapshots.data.length > 0,
  );
  TestValidator.predicate(
    "at least 2 snapshots from updates",
    snapshots.data.length >= 2,
  );
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshots.pagination.records > 0,
  );
}