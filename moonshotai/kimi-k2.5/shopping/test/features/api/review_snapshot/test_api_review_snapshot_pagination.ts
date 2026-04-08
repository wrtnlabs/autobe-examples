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

export async function test_api_review_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Create an initial review
  const initialReview =
    await generate_random_ecommerce_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          rating: 4,
          content: "Initial review content",
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(initialReview);
  // 3. Update the review multiple times to generate snapshots
  const update1Body = {
    rating: 5,
    content: "Updated review content - first edit",
  } satisfies IEcommerceMallReview.IUpdate;
  await api.functional.ecommerceMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: initialReview.id,
      body: update1Body,
    },
  );
  const update2Body = {
    rating: 3,
    content: "Updated review content - second edit",
  } satisfies IEcommerceMallReview.IUpdate;
  await api.functional.ecommerceMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: initialReview.id,
      body: update2Body,
    },
  );
  const update3Body = {
    rating: 4,
    content: "Updated review content - third edit",
  } satisfies IEcommerceMallReview.IUpdate;
  await api.functional.ecommerceMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: initialReview.id,
      body: update3Body,
    },
  );
  // 4. Switch to admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 5. Test pagination - first page with limit 2
  const page1Response =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: initialReview.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  // Validate pagination metadata
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 records > 0",
    page1Response.pagination.records > 0,
  );
  TestValidator.predicate(
    "page 1 pages >= 1",
    page1Response.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "page 1 data length <= limit",
    page1Response.data.length <= 2,
  );
  // 6. Test second page with limit 2
  const page2Response =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: initialReview.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate second page
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  // 7. Test with larger page size
  const allSnapshotsResponse =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: initialReview.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshotsResponse);
  // Validate total records match expected (3 snapshots from 3 updates)
  TestValidator.equals(
    "total snapshots",
    allSnapshotsResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "data length matches records",
    allSnapshotsResponse.data.length,
    3,
  );
  // 8. Validate chronological order (descending by creation time)
  if (allSnapshotsResponse.data.length >= 2) {
    for (let i = 0; i < allSnapshotsResponse.data.length - 1; i++) {
      const current = new Date(
        allSnapshotsResponse.data[i].createdAt,
      ).getTime();
      const next = new Date(
        allSnapshotsResponse.data[i + 1].createdAt,
      ).getTime();
      TestValidator.predicate(
        `snapshot ${i} createdAt >= snapshot ${i + 1} createdAt`,
        current >= next,
      );
    }
  }
  // 9. Validate snapshot structure and data integrity
  for (const snapshot of allSnapshotsResponse.data) {
    TestValidator.equals(
      "snapshot reviewId matches",
      snapshot.reviewId,
      initialReview.id,
    );
    TestValidator.predicate(
      "snapshot rating in range 1-5",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      snapshot.createdAt !== null,
    );
  }
}
