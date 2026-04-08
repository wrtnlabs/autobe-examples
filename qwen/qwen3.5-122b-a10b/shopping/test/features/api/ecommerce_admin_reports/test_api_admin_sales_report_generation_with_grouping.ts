import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReport";
import type { IEcommerceReportGroupedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReportGroupedResult";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin sales report generation with date grouping.
 *
 * Validates the admin sales report generation endpoint with date-based grouping. Ensures that an authenticated administrator can generate comprehensive sales reports with aggregated metrics including total revenue, order count, average order value, and total items sold. The report groups results by date dimension, providing daily breakdowns of sales metrics.
 *
 * The test verifies the complete report structure including report type identification, date range filters, aggregated metrics, and grouped results array. Each grouped result must contain a valid date dimension and corresponding metrics object with calculated values.
 *
 * 1. Administrator registers and authenticates with the system.
 * 2. Generate sales report with date grouping and date range filters.
 * 3. Validate report structure including report_type, date_range, metrics, and grouped_results.
 * 4. Verify grouped results contain valid date dimensions and metrics.
 * 5. Validate generated_at timestamp is properly set.
 */
export async function test_api_admin_sales_report_generation_with_grouping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate sales report with date grouping
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();
  const report = await api.functional.ecommerce.admin.reports.generate(
    adminConnection,
    {
      body: {
        reportType: "sales",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        grouping: "date",
        sortBy: "revenue",
        sortOrder: "desc",
        page: 1,
        limit: 100,
      } satisfies IEcommerceReport.IRequest,
    },
  );
  typia.assert(report);
  // 3. Validate report structure
  TestValidator.equals("report type is sales", report.report_type, "sales");
  TestValidator.predicate(
    "generated_at is set",
    report.generated_at !== undefined,
  );
  // Validate date range
  if (report.date_range) {
    TestValidator.predicate(
      "start date is set",
      report.date_range.start_date !== undefined,
    );
    TestValidator.predicate(
      "end date is set",
      report.date_range.end_date !== undefined,
    );
  }
  // 4. Validate metrics structure
  TestValidator.predicate(
    "metrics object exists",
    report.metrics !== undefined && report.metrics !== null,
  );
  // 5. Validate grouped results
  if (report.grouped_results) {
    TestValidator.predicate(
      "grouped results is array",
      Array.isArray(report.grouped_results),
    );
    // Validate each grouped result
    for (const result of report.grouped_results) {
      // Dimension should be a date string for date grouping
      TestValidator.predicate(
        "dimension is date string",
        typeof result.dimension === "string",
      );
      // Validate metrics object exists
      TestValidator.predicate(
        "metrics object exists",
        result.metrics !== undefined && result.metrics !== null,
      );
    }
    // Validate grouped results are sorted by revenue (desc)
    if (report.grouped_results.length > 1) {
      let previousRevenue = Number.MAX_VALUE;
      for (const result of report.grouped_results) {
        const currentRevenue = result.metrics.total_revenue ?? 0;
        TestValidator.predicate(
          "results sorted by revenue descending",
          currentRevenue <= previousRevenue,
        );
        previousRevenue = currentRevenue;
      }
    }
  }
}
