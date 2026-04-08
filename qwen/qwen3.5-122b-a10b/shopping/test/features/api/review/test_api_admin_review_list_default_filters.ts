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
 * Test administrator review listing with default filters and pagination.
 *
 * Validates that administrators can list all customer reviews on the platform with default filtering settings. The test verifies the endpoint returns a paginated list of review summaries with proper customer attribution, product context, rating values, and timestamps. Reviews are sorted by creation date in descending order by default.
 *
 * The test ensures pagination metadata is correctly calculated with current page, limit, total records, and total pages. Review data structure is validated to confirm each review contains required fields including customer attribution, product context, and rating values within valid range.
 *
 * 1. Administrator authenticates via registration flow.
 * 2. Calls admin reviews index endpoint with default parameters.
 * 3. Validates response structure includes pagination and review data.
 * 4. Verifies each review contains required fields: customer, product, rating, timestamps.
 * 5. Checks customer attribution has id, email, display_name.
 * 6. Validates product context includes id, name, seller, category, base_price.
 * 7. Confirms rating values are within 1-5 range.
 * 8. Validates pagination metadata has current, limit, records, pages.
 * 9. Verifies sorting order is created_at DESC.
 */
export async function test_api_admin_review_list_default_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Call admin reviews index with default parameters (empty body)
  const reviewsResponse: IPageIEcommerceReview.ISummary =
    await api.functional.ecommerce.admin.admin.reviews.index(adminConnection, {
      body: {} satisfies IEcommerceReview.IRequest,
    });
  typia.assert(reviewsResponse);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    reviewsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    reviewsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    reviewsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    reviewsResponse.pagination.pages >= 0,
  );
  // 4. Validate review data structure if reviews exist
  if (reviewsResponse.data.length > 0) {
    // Validate first review has all required fields
    const firstReview = reviewsResponse.data[0];
    typia.assert(firstReview);
    // Validate customer attribution
    typia.assert(firstReview.customer);
    TestValidator.predicate(
      "customer has id",
      firstReview.customer.id !== undefined,
    );
    TestValidator.predicate(
      "customer has email",
      firstReview.customer.email !== undefined,
    );
    TestValidator.predicate(
      "customer has display_name",
      firstReview.customer.display_name !== undefined,
    );
    // Validate product context
    typia.assert(firstReview.product);
    TestValidator.predicate(
      "product has id",
      firstReview.product.id !== undefined,
    );
    TestValidator.predicate(
      "product has name",
      firstReview.product.name !== undefined,
    );
    TestValidator.predicate(
      "product has seller",
      firstReview.product.seller !== undefined,
    );
    TestValidator.predicate(
      "product has category",
      firstReview.product.category !== undefined,
    );
    TestValidator.predicate(
      "product has base_price",
      firstReview.product.base_price !== undefined,
    );
    // Validate rating is between 1-5
    TestValidator.predicate(
      "rating is between 1-5",
      firstReview.rating >= 1 && firstReview.rating <= 5,
    );
    // 5. Verify sorting order (created_at DESC) - check if timestamps are descending
    if (reviewsResponse.data.length > 1) {
      for (let i = 0; i < reviewsResponse.data.length - 1; i++) {
        const current = new Date(reviewsResponse.data[i].created_at).getTime();
        const next = new Date(reviewsResponse.data[i + 1].created_at).getTime();
        TestValidator.predicate(
          `reviews sorted by created_at DESC at index ${i}`,
          current >= next,
        );
      }
    }
  }
}
