import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator review list with include deleted flag for audit purposes.
 *
 * Validates the admin review listing endpoint functionality with the includeDeleted parameter for administrative oversight. The test verifies that the API correctly accepts and processes the includeDeleted flag, returning paginated review listings for audit and moderation workflows.
 *
 * 1. Administrator authenticates via join endpoint.
 * 2. Query reviews with includeDeleted=false to get active reviews only.
 * 3. Query reviews with includeDeleted=true to get all reviews.
 * 4. Validates both queries return properly structured paginated responses.
 * 5. Verifies pagination metadata is correct for both query modes.
 */
export async function test_api_admin_review_list_include_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerce.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Query reviews with includeDeleted=false (default) - only active reviews
  const activeReviewsResponse: IPageIEcommerceReview.ISummary =
    await api.functional.ecommerce.admin.admin.reviews.index(adminConnection, {
      body: {
        includeDeleted: false,
        limit: 100,
      } satisfies IEcommerceReview.IRequest,
    });
  typia.assert(activeReviewsResponse);
  // 3. Query reviews with includeDeleted=true - both active and deleted reviews
  const allReviewsResponse: IPageIEcommerceReview.ISummary =
    await api.functional.ecommerce.admin.admin.reviews.index(adminConnection, {
      body: {
        includeDeleted: true,
        limit: 100,
      } satisfies IEcommerceReview.IRequest,
    });
  typia.assert(allReviewsResponse);
  // 4. Validate pagination metadata for active reviews query
  TestValidator.predicate(
    "active reviews pagination current is valid",
    activeReviewsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "active reviews pagination limit is valid",
    activeReviewsResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "active reviews pagination records is valid",
    activeReviewsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "active reviews pagination pages is valid",
    activeReviewsResponse.pagination.pages >= 0,
  );
  // 5. Validate pagination metadata for all reviews query
  TestValidator.predicate(
    "all reviews pagination current is valid",
    allReviewsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "all reviews pagination limit is valid",
    allReviewsResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "all reviews pagination records is valid",
    allReviewsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "all reviews pagination pages is valid",
    allReviewsResponse.pagination.pages >= 0,
  );
  // 6. Verify all reviews count >= active reviews count (when includeDeleted=true should return same or more)
  TestValidator.predicate(
    "all reviews count >= active reviews count",
    allReviewsResponse.data.length >= activeReviewsResponse.data.length,
  );
  // 7. Validate review data structure for active reviews
  for (const review of activeReviewsResponse.data) {
    TestValidator.predicate(
      "review has valid id",
      review.id !== undefined && review.id !== null,
    );
    TestValidator.predicate(
      "review has valid rating",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      "review has valid created_at",
      review.created_at !== undefined && review.created_at !== null,
    );
  }
  // 8. Validate review data structure for all reviews
  for (const review of allReviewsResponse.data) {
    TestValidator.predicate(
      "review has valid id",
      review.id !== undefined && review.id !== null,
    );
    TestValidator.predicate(
      "review has valid rating",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      "review has valid created_at",
      review.created_at !== undefined && review.created_at !== null,
    );
  }
}
