import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_review_snapshots_owner_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create a product review
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.paragraph({ sentences: 5 }),
        product_id: typia.random<string & tags.Format<"uuid">>(),
        order_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 3. Retrieve review snapshots
  const snapshots =
    await api.functional.ecommerceMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {} satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate snapshot structure and content
  TestValidator.equals("snapshots count", snapshots.data.length, 1);
  TestValidator.equals("current page", snapshots.pagination.current, 1);
  TestValidator.equals("limit", snapshots.pagination.limit, 20);
  TestValidator.equals("records count", snapshots.pagination.records, 1);
  TestValidator.equals("pages count", snapshots.pagination.pages, 1);
  const snapshot = snapshots.data[0];
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot type is created",
    snapshot.snapshot_type,
    "created",
  );
  TestValidator.equals(
    "old_data is null for initial creation",
    snapshot.old_data,
    null,
  );
  TestValidator.notEquals("new_data is not empty", snapshot.new_data, "");
  TestValidator.predicate(
    "snapshot has valid timestamp",
    snapshot.created_at !== undefined && snapshot.created_at.length > 0,
  );
  // 5. Validate review inside snapshot
  typia.assert(snapshot.review);
  TestValidator.equals(
    "snapshot review matches created review id",
    snapshot.review.id,
    review.id,
  );
  TestValidator.equals(
    "snapshot review customer matches authenticated user",
    snapshot.review.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "snapshot review rating matches created review",
    snapshot.review.rating,
    review.rating,
  );
  TestValidator.equals(
    "snapshot review is verified purchase",
    snapshot.review.is_verified_purchase,
    true,
  );
}
