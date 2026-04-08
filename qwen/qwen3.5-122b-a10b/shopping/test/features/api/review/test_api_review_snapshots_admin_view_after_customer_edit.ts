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

export async function test_api_review_snapshots_admin_view_after_customer_edit(
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
  // 3. Customer creates initial review
  // Note: In simulation mode, we use random UUID for orderItemId
  const initialReview = await generate_random_ecommerce_customer_reviews_create(
    customerConnection,
    {
      body: {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceReview.ICreate,
    },
  );
  typia.assert(initialReview);
  // 4. Customer updates the review to create a snapshot
  // Ensure the updated rating is different from the initial rating
  const updatedRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> =
    initialReview.rating === 5
      ? 3
      : ((initialReview.rating + 2) as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>);
  const updatedContent = RandomGenerator.paragraph({ sentences: 5 });
  const updatedReview = await api.functional.ecommerce.customer.reviews.update(
    customerConnection,
    {
      reviewId: initialReview.id,
      body: {
        rating: updatedRating,
        content: updatedContent,
      } satisfies IEcommerceReview.IUpdate,
    },
  );
  typia.assert(updatedReview);
  // 5. Administrator retrieves review snapshots
  const snapshotsResponse =
    await api.functional.ecommerce.admin.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: initialReview.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 6. Validate snapshot list
  TestValidator.predicate(
    "snapshots list is not empty",
    snapshotsResponse.data.length > 0,
  );
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshotsResponse.pagination.records > 0,
  );
  // 7. Validate each snapshot has required fields
  for (const snapshot of snapshotsResponse.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot rating is valid",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
    TestValidator.predicate(
      "snapshot has created_at timestamp",
      snapshot.created_at !== null && snapshot.created_at !== undefined,
    );
  }
  // 8. Validate snapshots are ordered by created_at descending (newest first)
  if (snapshotsResponse.data.length > 1) {
    for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
      const current = new Date(snapshotsResponse.data[i].created_at).getTime();
      const next = new Date(snapshotsResponse.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} is newer than snapshot ${i + 1}`,
        current >= next,
      );
    }
  }
}
