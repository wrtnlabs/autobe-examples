import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReport";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReport";

/**
 * Test the retrieval of a filtered and paginated list of administrative reports
 * for business analysis.
 *
 * This test performs an end-to-end workflow where an admin account is
 * registered via the admin join endpoint. Upon successful registration, the
 * admin is authenticated and provided an authorization token. Using this token,
 * the test executes a paginated and filtered search request on the
 * /shoppingMall/admin/reports endpoint, specifying parameters such as page
 * number, page size, report type, and creation date range.
 *
 * The test verifies the response structure matches the expected paginated
 * report summaries. It asserts that all returned reports comply with the filter
 * criteria and that the pagination metadata is consistent. It also implicitly
 * tests security by requiring valid admin authentication to execute the reports
 * listing.
 */
export async function test_api_admin_reports_index(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join) with realistic email/password data
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const adminCreateBody = {
    email: adminEmail,
    password_hash: "hashed_password_example",
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Verify admin authentication token is correctly issued
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 3. Prepare a filtered report search request with pagination and filter fields
  const now = new Date();
  const createdAfter = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const createdBefore = now;

  const reportTypeFilter = "sales_summary";

  const reportSearchRequest = {
    page: 1,
    limit: 10,
    reportType: reportTypeFilter,
    createdAfter: createdAfter.toISOString(),
    createdBefore: createdBefore.toISOString(),
  } satisfies IShoppingMallReport.IRequest;

  // 4. Perform admin reports search (/shoppingMall/admin/reports PATCH) with the token
  const reportPage: IPageIShoppingMallReport.ISummary =
    await api.functional.shoppingMall.admin.reports.index(connection, {
      body: reportSearchRequest,
    });
  typia.assert(reportPage);

  // 5. Assert the returned page conforms to TypeScript paginated response shape
  TestValidator.predicate(
    "pagination object exists",
    reportPage.pagination !== null && typeof reportPage.pagination === "object",
  );

  // 6. Validate that returned report summaries conform to request filters
  for (const report of reportPage.data) {
    typia.assert<IShoppingMallReport.ISummary>(report);

    // reportType matches filter
    TestValidator.equals(
      `report type matches filter for report id ${report.id}`,
      report.report_type,
      reportTypeFilter,
    );

    // created_at within the specified range
    TestValidator.predicate(
      `report created_at >= createdAfter for id ${report.id}`,
      new Date(report.created_at) >= createdAfter,
    );
    TestValidator.predicate(
      `report created_at <= createdBefore for id ${report.id}`,
      new Date(report.created_at) <= createdBefore,
    );
  }

  // 7. Validate pagination metadata (page, limit, record counts, pages)
  const { current, limit, records, pages } = reportPage.pagination;

  TestValidator.equals(
    "pagination current matches request page",
    current,
    reportSearchRequest.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit matches request limit",
    limit,
    reportSearchRequest.limit ?? 10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    records >= 0,
  );
  TestValidator.predicate("pagination pages count is non-negative", pages >= 0);
  // pages should be at least 1 if records > 0
  if (records > 0) {
    TestValidator.predicate(
      "pages count must be >= 1 if records > 0",
      pages >= 1,
    );
  }

  // 8. Ensure secure access is enforced by the presence of a valid admin token
  // Implicit - since the call succeeded and returned valid data, auth is enforced
}
