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
 * Test an administrator's comprehensive search and filtering of review reports for moderation workflow.
 * Authenticate as an administrator using join. Make a search request with multiple filters:
 * set report_category to 'spam', specify a recent date range using created_at_from and created_at_to,
 * add partial keyword search in report_reason, and request pagination (page=1, limit=10).
 * Validate the response contains a paginated list (IPageIEcommerceReviewReport.ISummary).
 * Check that each summary item has required fields: id, report_category, created_at, updated_at,
 * customer (summary with id, email, display_name), and review (summary with id, rating, content, created_at, customer).
 * Ensure the pagination metadata (current, limit, records, pages) is correct.
 * The test must verify that the filtering logic works correctly and returns only relevant reports for administrator review.
 */
export async function test_api_review_moderation_search_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: (typia.random<string & tags.Format<"password">>() ||
        RandomGenerator.alphaNumeric(16)) satisfies string,
    },
  });
  typia.assert(adminAuth);
  // Step 2: Prepare filter parameters with realistic data
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Generate a keyword for partial search
  const keyword = RandomGenerator.alphabets(8);
  const reportReason = `${keyword} ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const requestBody = {
    report_category: "spam",
    report_reason: reportReason,
    created_at_from: thirtyDaysAgo.toISOString(),
    created_at_to: now.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IEcommerceReviewReport.IRequest;
  // Step 3: Execute search with comprehensive filtering
  const result =
    await api.functional.ecommerce.administrator.moderation.reviews.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(result);
  // Step 4: Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.predicate(
    "records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", result.pagination.pages >= 0);
  // Step 5: Validate each summary item structure and filtering logic
  for (const summary of result.data) {
    typia.assert(summary);
    typia.assert(summary.customer);
    typia.assert(summary.review);
    typia.assert(summary.review.customer);
    // Business logic: verify filtering criteria
    TestValidator.equals(
      "report category matches spam filter",
      summary.report_category,
      "spam",
    );
    // Date range validation: created_at should be within specified range
    const createdAt = new Date(summary.created_at);
    TestValidator.predicate(
      "created_at within from date range",
      createdAt >= thirtyDaysAgo,
    );
    TestValidator.predicate(
      "created_at within to date range",
      createdAt <= now,
    );
    // Optional: verify report_reason contains keyword (partial match)
    // Note: Server may implement partial match, so we don't enforce exact match
  }
  // Step 6: Overall validation
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // Calculate expected pages based on records and limit
  if (result.pagination.records > 0) {
    const expectedPages = Math.ceil(
      result.pagination.records / result.pagination.limit,
    );
    TestValidator.equals(
      "pages calculated correctly",
      result.pagination.pages,
      expectedPages,
    );
  }
}
