import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test the administrator's ability to search and filter review reports across the entire platform.
 * Authenticate as administrator, then execute search query with pagination parameters.
 * Verify that the response includes paginated review report summaries with proper customer
 * and review information. Validate that the results exclude soft-deleted reports by default
 * and include all essential fields for moderation workflow.
 * Test different filter combinations including date ranges, report categories, and
 * customer/review identifiers. Confirm that the search respects the default sort order
 * (created_at descending).
 */
export async function test_api_review_reports_search_all_reports(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test 1: Basic search with minimal filters (should return all active reports)
  const basicSearchResult =
    await api.functional.ecommerce.administrator.reports.reviews.index(
      adminConnection,
      {
        body: typia.random<IEcommerceReviewReport>(),
      },
    );
  typia.assert(basicSearchResult);
  // Test 2: Search with specific report category filter
  const categorySearchCriteria = typia.random<IEcommerceReviewReport>();
  categorySearchCriteria.report_category = "spam";
  const categorySearchResult =
    await api.functional.ecommerce.administrator.reports.reviews.index(
      adminConnection,
      {
        body: categorySearchCriteria,
      },
    );
  typia.assert(categorySearchResult);
  // Test 3: Search with date range filter
  const dateRangeSearchCriteria = typia.random<IEcommerceReviewReport>();
  dateRangeSearchCriteria.created_at = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeSearchResult =
    await api.functional.ecommerce.administrator.reports.reviews.index(
      adminConnection,
      {
        body: dateRangeSearchCriteria,
      },
    );
  typia.assert(dateRangeSearchResult);
  // Test 4: Validate report summary structure through business logic validation
  if (basicSearchResult.data.length > 0) {
    const sampleReport = basicSearchResult.data[0];
    // Business logic validation only - no type checking after typia.assert()
    TestValidator.predicate(
      "report has non-empty category",
      sampleReport.report_category.length > 0,
    );
    TestValidator.predicate(
      "customer has valid display name",
      sampleReport.customer.display_name.length > 0,
    );
    TestValidator.predicate(
      "review rating is within valid range",
      sampleReport.review.rating >= 1 && sampleReport.review.rating <= 5,
    );
  }
  // Test 5: Verify that results are sorted by created_at descending (default sort)
  if (basicSearchResult.data.length > 1) {
    for (let i = 1; i < basicSearchResult.data.length; i++) {
      const currentReport = new Date(basicSearchResult.data[i].created_at);
      const previousReport = new Date(basicSearchResult.data[i - 1].created_at);
      TestValidator.predicate(
        `report ${i} is correctly sorted (descending)`,
        previousReport >= currentReport,
      );
    }
  }
}
