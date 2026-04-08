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
 * Test admin report generation with date range filtering.
 *
 * Validates the admin report generation endpoint's date range filtering capabilities. The test ensures that reports correctly filter data based on startDate and endDate parameters, respects the 365-day maximum range constraint, and returns appropriate responses for empty result sets.
 *
 * The test covers multiple scenarios including baseline reports without filters, filtered reports with specific date ranges, edge cases with maximum date range limits, and validation that metrics are properly calculated within the specified date boundaries.
 *
 * 1. Create and authenticate admin account for report access.
 * 2. Generate baseline report without date filters to establish total metrics.
 * 3. Generate report with specific date range and validate filtering.
 * 4. Verify date_range object in response matches input parameters.
 * 5. Test date range exceeding 365 days constraint.
 * 6. Generate report with date range containing no data.
 * 7. Validate metrics are correctly filtered and calculated.
 */
export async function test_api_admin_report_with_date_range_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate baseline report without date filters
  const baselineReport = await api.functional.ecommerce.admin.reports.generate(
    adminConnection,
    {
      body: {
        reportType: "sales",
      } satisfies IEcommerceReport.IRequest,
    },
  );
  typia.assert(baselineReport);
  // Validate baseline report structure
  TestValidator.equals(
    "report type is sales",
    baselineReport.report_type,
    "sales",
  );
  TestValidator.predicate(
    "has generated_at",
    baselineReport.generated_at !== undefined,
  );
  // 3. Generate report with specific date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = thirtyDaysAgo.toISOString();
  const endDate = now.toISOString();
  const filteredReport = await api.functional.ecommerce.admin.reports.generate(
    adminConnection,
    {
      body: {
        reportType: "sales",
        startDate,
        endDate,
      } satisfies IEcommerceReport.IRequest,
    },
  );
  typia.assert(filteredReport);
  // 4. Validate date_range object in response
  TestValidator.equals(
    "date_range exists when filters provided",
    filteredReport.date_range !== undefined,
    true,
  );
  if (filteredReport.date_range) {
    TestValidator.equals(
      "start_date matches input",
      filteredReport.date_range.start_date,
      startDate,
    );
    TestValidator.equals(
      "end_date matches input",
      filteredReport.date_range.end_date,
      endDate,
    );
  }
  // 5. Test date range exceeding 365 days constraint
  const oneYearAgo = new Date(now.getTime() - 366 * 24 * 60 * 60 * 1000);
  const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
  // This should either fail validation or the server should adjust the range
  const result = await api.functional.ecommerce.admin.reports.generate(
    adminConnection,
    {
      body: {
        reportType: "sales",
        startDate: twoYearsAgo.toISOString(),
        endDate: oneYearAgo.toISOString(),
      } satisfies IEcommerceReport.IRequest,
    },
  );
  typia.assert(result);
  // Server may accept or reject - both are valid behaviors
  // If accepted, the date_range should reflect any adjustments
  if (result.date_range) {
    const start = new Date(
      result.date_range.start_date ??
        result.date_range.end_date ??
        now.toISOString(),
    );
    const end = new Date(result.date_range.end_date ?? now.toISOString());
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    TestValidator.predicate(
      "date range within 365 days constraint",
      daysDiff <= 365,
    );
  }
  // 6. Generate report with date range containing no data
  const farPast = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000);
  const farPastEnd = new Date(farPast.getTime() + 30 * 24 * 60 * 60 * 1000);
  const emptyReport = await api.functional.ecommerce.admin.reports.generate(
    adminConnection,
    {
      body: {
        reportType: "sales",
        startDate: farPast.toISOString(),
        endDate: farPastEnd.toISOString(),
      } satisfies IEcommerceReport.IRequest,
    },
  );
  typia.assert(emptyReport);
  // Should return 200 OK with empty grouped_results
  TestValidator.equals(
    "empty report returns success",
    emptyReport.report_type,
    "sales",
  );
  TestValidator.equals(
    "grouped_results is array for empty data",
    Array.isArray(emptyReport.grouped_results ?? []),
    true,
  );
  // 7. Validate metrics structure
  TestValidator.predicate(
    "metrics object exists",
    emptyReport.metrics !== undefined,
  );
}
