import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_review_moderation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  typia.assert(admin);
  // 2. Query reviews for a specific customer (admin can filter by customerId)
  // This validates admin access to customer review data including inactive reviews
  const adminConnectionForQuery: api.IConnection = { host: connection.host };
  const testCustomerId = typia.random<string & tags.Format<"uuid">>();
  const adminReviewsResponse = await api.functional.ecommerceMall.reviews.index(
    adminConnectionForQuery,
    {
      body: {
        customerId: testCustomerId,
        page: 1,
        pageSize: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    },
  );
  typia.assert(adminReviewsResponse);
  // 3. Validate pagination metadata is correct
  TestValidator.equals(
    "admin reviews query - pagination current page",
    adminReviewsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "admin reviews query - pagination limit",
    adminReviewsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "admin reviews query - pagination pages",
    adminReviewsResponse.pagination.pages,
    adminReviewsResponse.pagination.records === 0
      ? 0
      : Math.ceil(adminReviewsResponse.pagination.records / 20),
  );
  // 4. Validate sorting direction is respected
  // Check that reviews are sorted by createdAt in descending order
  const reviews = adminReviewsResponse.data;
  if (reviews.length > 1) {
    for (let i = 1; i < reviews.length; i++) {
      TestValidator.predicate(
        "admin reviews sorted by createdAt desc",
        () =>
          new Date(reviews[i - 1]!.createdAt) >=
          new Date(reviews[i]!.createdAt),
      );
    }
  }
  // 5. Validate review data structure and fields
  for (const review of reviews) {
    typia.assert(review);
    // Validate review has required fields
    TestValidator.notEquals(
      "admin reviews - review has id",
      review.id,
      undefined,
    );
    TestValidator.notEquals(
      "admin reviews - review has rating",
      review.rating,
      undefined,
    );
    TestValidator.notEquals(
      "admin reviews - review has isActive",
      review.isActive,
      undefined,
    );
    TestValidator.notEquals(
      "admin reviews - review has createdAt",
      review.createdAt,
      undefined,
    );
    TestValidator.notEquals(
      "admin reviews - review has deletedAt",
      review.deletedAt,
      undefined,
    );
    // Validate rating is within range
    TestValidator.predicate(
      "admin reviews - rating is between 1 and 5",
      review.rating >= 1 && review.rating <= 5,
    );
    // Validate customer reference is present
    TestValidator.notEquals(
      "admin reviews - review has customer reference",
      review.customer.id,
      undefined,
    );
    TestValidator.notEquals(
      "admin reviews - customer has email",
      review.customer.email,
      undefined,
    );
    // Validate customer profile has display name
    TestValidator.notEquals(
      "admin reviews - customer has display name",
      review.customer.customerProfile.displayName,
      undefined,
    );
    // Validate product reference is present
    TestValidator.notEquals(
      "admin reviews - review has product reference",
      review.product.id,
      undefined,
    );
  }
  // 6. Test date range filtering
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const dateFilteredResponse = await api.functional.ecommerceMall.reviews.index(
    adminConnectionForQuery,
    {
      body: {
        customerId: testCustomerId,
        createdAtFrom: from.toISOString(),
        createdAtTo: to.toISOString(),
      },
    },
  );
  typia.assert(dateFilteredResponse);
  // Validate date range filtering works
  for (const review of dateFilteredResponse.data) {
    const reviewDate = new Date(review.createdAt);
    TestValidator.predicate(
      "admin reviews - review createdAt within date range",
      reviewDate >= from && reviewDate <= to,
    );
  }
  // 7. Test sorting by rating
  const ratingSortedResponse = await api.functional.ecommerceMall.reviews.index(
    adminConnectionForQuery,
    {
      body: {
        customerId: testCustomerId,
        sortBy: "rating",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(ratingSortedResponse);
  // Validate rating sorting
  const ratingReviews = ratingSortedResponse.data;
  if (ratingReviews.length > 1) {
    for (let i = 1; i < ratingReviews.length; i++) {
      TestValidator.predicate(
        "admin reviews sorted by rating asc",
        () => ratingReviews[i - 1]!.rating <= ratingReviews[i]!.rating,
      );
    }
  }
  // 8. Test rating range filtering
  const ratingFilteredResponse =
    await api.functional.ecommerceMall.reviews.index(adminConnectionForQuery, {
      body: {
        customerId: testCustomerId,
        ratingMin: 4,
        ratingMax: 5,
      },
    });
  typia.assert(ratingFilteredResponse);
  // Validate rating range filtering
  for (const review of ratingFilteredResponse.data) {
    TestValidator.predicate(
      "admin reviews - rating in filtered range",
      review.rating >= 4 && review.rating <= 5,
    );
  }
  // 9. Test pagination - request page 2
  const page2Response = await api.functional.ecommerceMall.reviews.index(
    adminConnectionForQuery,
    {
      body: {
        customerId: testCustomerId,
        page: 2,
        pageSize: 10,
      },
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "admin reviews - page 2 pagination",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "admin reviews - page 2 limit",
    page2Response.pagination.limit,
    10,
  );
  // 10. Test empty result - filter by non-existent customerId
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  const emptyResponse = await api.functional.ecommerceMall.reviews.index(
    adminConnectionForQuery,
    {
      body: {
        customerId: nonExistentCustomerId,
      },
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "admin reviews - empty result for non-existent customer",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "admin reviews - empty pagination records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "admin reviews - empty pagination pages",
    emptyResponse.pagination.pages,
    0,
  );
}
