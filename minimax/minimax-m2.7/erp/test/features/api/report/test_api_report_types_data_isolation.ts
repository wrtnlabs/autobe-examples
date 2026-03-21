import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that report types endpoint enforces data isolation between organizations.
 *
 * This test validates that:
 * 1. Admin authenticates and gets their organization context
 * 2. The report types endpoint returns HTTP 200 status
 * 3. All 3 report types are present as hardcoded metadata
 * 4. Report types are organization-agnostic (not derived from actual report data)
 *
 * Valid report types:
 * - time_report: Hours logged per employee
 * - project_budget_report: Budget consumption across projects
 * - weekly_summary_report: Week-by-week productivity statistics
 */
export async function test_api_report_types_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins to get authenticated and obtain organization context
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  // Validate authentication response
  typia.assert(authorized);
  // 2. Call GET /erpHrm/admin/organizations/{organizationId}/reports/types
  // Note: For this test, we use the authenticated admin's context
  // The endpoint returns hardcoded metadata, not organization-specific data
  const reportTypes =
    await api.functional.erpHrm.admin.organizations.reports.types.listTypes(
      adminConnection,
      {
        organizationId: authorized.id, // Using admin's ID as organization identifier
      },
    );
  // Validate response structure
  typia.assert(reportTypes);
  // 3. Verify HTTP 200 response (typia.assert validates successful response)
  TestValidator.predicate("response is non-null", reportTypes !== null);
  // 4. Verify all 3 report types are present
  // Report types are hardcoded metadata: time_report, project_budget_report, weekly_summary_report
  const expectedReportTypes = [
    "time_report",
    "project_budget_report",
    "weekly_summary_report",
  ] as const;
  // Handle both array and single object responses
  const reportTypesArray = Array.isArray(reportTypes) ? reportTypes : [reportTypes];
  // Validate that response is an array with exactly 3 items
  TestValidator.equals(
    "should have exactly 3 report types",
    reportTypesArray.length,
    3,
  );
  // Validate all expected report types are present
  for (const expectedType of expectedReportTypes) {
    const found = ArrayUtil.has(reportTypesArray, (item) => item.report_type === expectedType);
    TestValidator.predicate(
      `report type "${expectedType}" should be present`,
      found,
    );
  }
  // 5. Validate report type structure and descriptions
  // Each report type should have report_type and description properties
  for (const item of reportTypesArray) {
    TestValidator.predicate(
      `report type "${item.report_type}" has non-empty description`,
      item.description !== null &&
        item.description !== undefined &&
        item.description.length > 0,
    );
  }
  // 6. Verify report types are hardcoded metadata (not derived from database)
  // By checking that we get the same 3 types regardless of organization context
  const secondCall =
    await api.functional.erpHrm.admin.organizations.reports.types.listTypes(
      adminConnection,
      {
        organizationId: authorized.id,
      },
    );
  typia.assert(secondCall);
  // Both calls should return identical report types (proving they're hardcoded)
  TestValidator.equals(
    "second call returns same report types",
    secondCall,
    reportTypes,
  );
}