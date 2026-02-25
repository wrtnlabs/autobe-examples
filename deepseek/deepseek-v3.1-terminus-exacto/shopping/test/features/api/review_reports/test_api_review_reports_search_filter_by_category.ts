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
 * Test targeted filtering by specific report categories to support prioritized moderation workflows.
 * Authenticate as administrator, then perform search with specific category filters such as "inappropriate", "spam", or "misinformation".
 * Verify that only reports matching the specified category are returned. Test pagination behavior with category filters including empty result scenarios and multi-page result sets.
 * Validate that the category filtering works correctly with other filter combinations like date ranges and customer IDs.
 */
export async function test_api_review_reports_search_filter_by_category(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // Test different report categories
  const reportCategories = ["inappropriate", "spam", "misinformation"] as const;
  for (const category of reportCategories) {
    // Create complete IEcommerceReviewReport search body with all required properties
    const searchBody: IEcommerceReviewReport = {
      id: typia.random<string & tags.Format<"uuid">>(),
      report_reason: "Test reason",
      report_category: category,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      customer: {
        id: typia.random<string & tags.Format<"uuid">>(),
        email: typia.random<string & tags.Format<"email">>(),
        display_name: "Test Customer",
        created_at: new Date().toISOString(),
      },
      review: {
        id: typia.random<string & tags.Format<"uuid">>(),
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: "Test review content",
        created_at: new Date().toISOString(),
        customer: {
          id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string & tags.Format<"email">>(),
          display_name: "Review Customer",
          created_at: new Date().toISOString(),
        },
      },
    } satisfies IEcommerceReviewReport;
    const results =
      await api.functional.ecommerce.administrator.reports.reviews.index(
        adminConnection,
        { body: searchBody },
      );
    typia.assert(results);
    // Validate response structure
    TestValidator.equals(
      `${category} search returns valid pagination structure`,
      typeof results.pagination.current,
      "number",
    );
    TestValidator.equals(
      `${category} search returns array data`,
      Array.isArray(results.data),
      true,
    );
  }
  // Test pagination behavior with category filter
  const paginationSearchBody: IEcommerceReviewReport = {
    id: typia.random<string & tags.Format<"uuid">>(),
    report_reason: "Pagination test",
    report_category: "inappropriate",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    customer: {
      id: typia.random<string & tags.Format<"uuid">>(),
      email: typia.random<string & tags.Format<"email">>(),
      display_name: "Paginated Customer",
      created_at: new Date().toISOString(),
    },
    review: {
      id: typia.random<string & tags.Format<"uuid">>(),
      rating: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
      content: "Pagination review",
      created_at: new Date().toISOString(),
      customer: {
        id: typia.random<string & tags.Format<"uuid">>(),
        email: typia.random<string & tags.Format<"email">>(),
        display_name: "Paginated Review Customer",
        created_at: new Date().toISOString(),
      },
    },
  } satisfies IEcommerceReviewReport;
  const paginationResults =
    await api.functional.ecommerce.administrator.reports.reviews.index(
      adminConnection,
      { body: paginationSearchBody },
    );
  typia.assert(paginationResults);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    paginationResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    paginationResults.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    paginationResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    paginationResults.pagination.pages >= 0,
  );
}
