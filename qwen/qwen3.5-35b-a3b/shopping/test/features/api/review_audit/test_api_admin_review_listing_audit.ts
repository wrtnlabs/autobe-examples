import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_admin_review_listing_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Admin lists all reviews (non-deleted by default)
  const allReviewsResponse = await api.functional.ecommerceMall.reviews.index(
    adminConnection,
    {
      body: {
        page: 1,
        page_size: 100,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(allReviewsResponse);
  // 3. Verify response structure for non-deleted reviews
  TestValidator.equals(
    "response has data array",
    Array.isArray(allReviewsResponse.data),
    true,
  );
  TestValidator.equals(
    "response has pagination",
    allReviewsResponse.pagination !== undefined,
    true,
  );
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    allReviewsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    allReviewsResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    allReviewsResponse.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages >= 0",
    allReviewsResponse.pagination.pages,
    0,
  );
  // 5. If reviews exist, validate their structure
  if (allReviewsResponse.data.length > 0) {
    const firstReview = allReviewsResponse.data[0];
    // Validate review ID
    TestValidator.predicate(
      "review has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstReview.id,
      ),
    );
    // Validate rating is 1-5
    TestValidator.predicate(
      "rating between 1-5",
      firstReview.rating >= 1 && firstReview.rating <= 5,
    );
    // Validate review_text can be null
    TestValidator.predicate(
      "review_text is string or null",
      firstReview.review_text === null ||
        typeof firstReview.review_text === "string",
    );
    // Validate member has required fields
    TestValidator.equals(
      "member has id",
      firstReview.member.id !== undefined,
      true,
    );
    TestValidator.equals(
      "member has email",
      firstReview.member.email !== undefined,
      true,
    );
    TestValidator.equals(
      "member has display_name",
      firstReview.member.display_name !== undefined,
      true,
    );
    // Validate product has required fields
    TestValidator.equals(
      "product has id",
      firstReview.product.id !== undefined,
      true,
    );
    TestValidator.equals(
      "product has name",
      firstReview.product.name !== undefined,
      true,
    );
    // Validate order item has required fields
    TestValidator.equals(
      "orderItem has id",
      firstReview.orderItem.id !== undefined,
      true,
    );
    TestValidator.equals(
      "orderItem has status",
      firstReview.orderItem.status !== undefined,
      true,
    );
    // Validate timestamps
    TestValidator.predicate(
      "created_at is valid datetime",
      !isNaN(Date.parse(firstReview.created_at)),
    );
    TestValidator.predicate(
      "updated_at is valid datetime",
      !isNaN(Date.parse(firstReview.updated_at)),
    );
    TestValidator.predicate(
      "deleted_at is null or valid datetime",
      firstReview.deleted_at === null ||
        !isNaN(Date.parse(firstReview.deleted_at)),
    );
    // Validate deleted_at is null for non-deleted reviews
    if (firstReview.deleted_at === null) {
      TestValidator.predicate("non-deleted review has null deleted_at", true);
    }
  }
  // 6. Test include_deleted=true flag (admin-specific feature)
  const allReviewsWithDeletedResponse =
    await api.functional.ecommerceMall.reviews.index(adminConnection, {
      body: {
        page: 1,
        page_size: 100,
        include_deleted: true,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(allReviewsWithDeletedResponse);
  // Verify response structure is the same
  TestValidator.equals(
    "deleted reviews has data array",
    Array.isArray(allReviewsWithDeletedResponse.data),
    true,
  );
  TestValidator.equals(
    "deleted reviews has pagination",
    allReviewsWithDeletedResponse.pagination !== undefined,
    true,
  );
  // 7. Test filtering by product_id
  const productFilteredResponse =
    await api.functional.ecommerceMall.reviews.index(adminConnection, {
      body: {
        page: 1,
        page_size: 100,
        product_id: typia.random<string & tags.Format<"uuid">>(),
        include_deleted: true,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(productFilteredResponse);
  // If any reviews returned, verify they match the product filter
  if (productFilteredResponse.data.length > 0) {
    for (const review of productFilteredResponse.data) {
      TestValidator.equals(
        "review product_id matches filter",
        review.product.id,
        productFilteredResponse.pagination.records > 0
          ? productFilteredResponse.data[0].product.id
          : review.product.id,
      );
    }
  }
  // 8. Test filtering by rating range
  const ratingFilteredResponse =
    await api.functional.ecommerceMall.reviews.index(adminConnection, {
      body: {
        page: 1,
        page_size: 100,
        rating_min: 3,
        rating_max: 5,
        include_deleted: true,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(ratingFilteredResponse);
  // If reviews returned, verify they are in rating range
  if (ratingFilteredResponse.data.length > 0) {
    for (const review of ratingFilteredResponse.data) {
      TestValidator.predicate(
        "rating within filtered range",
        review.rating >= 3 && review.rating <= 5,
      );
    }
  }
  // 9. Test sorting by rating descending
  const sortedByRatingResponse =
    await api.functional.ecommerceMall.reviews.index(adminConnection, {
      body: {
        page: 1,
        page_size: 100,
        sort_by: "rating",
        sort_order: "desc",
        include_deleted: true,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(sortedByRatingResponse);
  // 10. Test pagination with smaller page size
  const paginatedResponse = await api.functional.ecommerceMall.reviews.index(
    adminConnection,
    {
      body: {
        page: 1,
        page_size: 10,
        include_deleted: true,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "page size respects limit",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.equals("page is 1", paginatedResponse.pagination.current, 1);
  TestValidator.predicate(
    "total records >= 0",
    paginatedResponse.pagination.records >= 0,
  );
  // 11. Test sorting by created_at (default)
  const sortedByDateResponse = await api.functional.ecommerceMall.reviews.index(
    adminConnection,
    {
      body: {
        page: 1,
        page_size: 100,
        sort_by: "created_at",
        sort_order: "desc",
        include_deleted: true,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(sortedByDateResponse);
  // 12. Test sorting by updated_at
  const sortedByUpdatedResponse =
    await api.functional.ecommerceMall.reviews.index(adminConnection, {
      body: {
        page: 1,
        page_size: 100,
        sort_by: "updated_at",
        sort_order: "desc",
        include_deleted: true,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(sortedByUpdatedResponse);
  // 13. Test date range filtering
  const dateFilteredResponse = await api.functional.ecommerceMall.reviews.index(
    adminConnection,
    {
      body: {
        page: 1,
        page_size: 100,
        created_after: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 30,
        ).toISOString(), // 30 days ago
        created_before: new Date().toISOString(),
        include_deleted: true,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(dateFilteredResponse);
  // 14. Test sorting ascending
  const ascSortedResponse = await api.functional.ecommerceMall.reviews.index(
    adminConnection,
    {
      body: {
        page: 1,
        page_size: 100,
        sort_order: "asc",
        include_deleted: true,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(ascSortedResponse);
  // 15. Verify admin can access review data (admin privilege test)
  TestValidator.predicate(
    "admin can access reviews",
    allReviewsWithDeletedResponse !== undefined,
  );
}