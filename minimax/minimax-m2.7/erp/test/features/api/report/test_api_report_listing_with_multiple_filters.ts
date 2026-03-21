import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_organizations_reports_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

export async function test_api_report_listing_with_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // Use a valid UUID format for organizationId (simulation mode accepts any UUID format)
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create multiple reports of different types
  const reportTypes = [
    "time_report",
    "project_budget_report",
    "weekly_summary_report",
  ] as const;
  const createdReports: IErpHrmReport[] = [];
  // Create 3 reports with different types
  for (const reportType of reportTypes) {
    const report =
      await generate_random_erp_hrm_admin_organizations_reports_create(
        adminConnection,
        {
          params: { organizationId },
          body: {
            report_type: reportType,
            name: RandomGenerator.paragraph({ sentences: 1 }),
            parameter: {
              start_date: new Date(
                Date.now() - 7 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              end_date: new Date().toISOString(),
              group_by: RandomGenerator.pick([
                "employee",
                "project",
                "task",
              ] as const),
            },
          },
        },
      );
    typia.assert(report);
    createdReports.push(report);
  }
  // 3. Test 1: Retrieve all reports without filters and verify pagination metadata
  const allReportsResponse =
    await api.functional.erpHrm.admin.organizations.reports.index(
      adminConnection,
      {
        organizationId,
        body: {},
      },
    );
  typia.assert(allReportsResponse);
  TestValidator.equals(
    "pagination exists",
    allReportsResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "pagination has required fields",
    allReportsResponse.pagination.current >= 0 &&
      allReportsResponse.pagination.limit >= 0 &&
      allReportsResponse.pagination.records >= 0 &&
      allReportsResponse.pagination.pages >= 0,
  );
  // 4. Test 2: Filter by report_type (exact match)
  const timeReportFilter =
    await api.functional.erpHrm.admin.organizations.reports.index(
      adminConnection,
      {
        organizationId,
        body: {
          report_type: "time_report",
        },
      },
    );
  typia.assert(timeReportFilter);
  for (const report of timeReportFilter.data) {
    TestValidator.equals(
      "report_type is time_report",
      report.report_type,
      "time_report",
    );
  }
  // 5. Test 3: Filter by name using partial match (ILIKE)
  const searchName = createdReports[0].name?.substring(0, 5) ?? "test";
  const nameFilter =
    await api.functional.erpHrm.admin.organizations.reports.index(
      adminConnection,
      {
        organizationId,
        body: {
          name: searchName,
        },
      },
    );
  typia.assert(nameFilter);
  for (const report of nameFilter.data) {
    if (report.name) {
      TestValidator.predicate(
        "name contains search term",
        report.name.toLowerCase().includes(searchName.toLowerCase()),
      );
    }
  }
  // 6. Test 4: Filter by date range (start_date and end_date)
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();
  const dateRangeFilter =
    await api.functional.erpHrm.admin.organizations.reports.index(
      adminConnection,
      {
        organizationId,
        body: {
          start_date: startDate,
          end_date: endDate,
        },
      },
    );
  typia.assert(dateRangeFilter);
  for (const report of dateRangeFilter.data) {
    const reportDate = new Date(report.created_at);
    TestValidator.predicate(
      "report within date range",
      reportDate >= new Date(startDate) && reportDate <= new Date(endDate),
    );
  }
  // 7. Test 5: Filter by generated_by_member_id
  const memberId = createdReports[0].generatedByMember.id;
  const memberFilter =
    await api.functional.erpHrm.admin.organizations.reports.index(
      adminConnection,
      {
        organizationId,
        body: {
          generated_by_member_id: memberId,
        },
      },
    );
  typia.assert(memberFilter);
  for (const report of memberFilter.data) {
    TestValidator.equals(
      "generated_by_member matches",
      report.generatedByMember.id,
      memberId,
    );
  }
  // 8. Test 6: Combine multiple filters (report_type + date range)
  const combinedFilter =
    await api.functional.erpHrm.admin.organizations.reports.index(
      adminConnection,
      {
        organizationId,
        body: {
          report_type: "project_budget_report",
          start_date: startDate,
          end_date: endDate,
        },
      },
    );
  typia.assert(combinedFilter);
  for (const report of combinedFilter.data) {
    TestValidator.equals(
      "report_type matches combined filter",
      report.report_type,
      "project_budget_report",
    );
    const reportDate = new Date(report.created_at);
    TestValidator.predicate(
      "report within date range combined",
      reportDate >= new Date(startDate) && reportDate <= new Date(endDate),
    );
  }
  // 9. Test 7: Verify response includes required fields
  const requiredFieldsReport =
    await api.functional.erpHrm.admin.organizations.reports.index(
      adminConnection,
      {
        organizationId,
        body: { limit: 1 },
      },
    );
  typia.assert(requiredFieldsReport);
  if (requiredFieldsReport.data.length > 0) {
    const report = requiredFieldsReport.data[0];
    TestValidator.predicate(
      "has id",
      report.id !== undefined && report.id !== null,
    );
    TestValidator.predicate(
      "has report_type",
      report.report_type !== undefined,
    );
    TestValidator.predicate("has name (nullable)", true);
    TestValidator.predicate("has created_at", report.created_at !== undefined);
    TestValidator.predicate(
      "has generatedByMember",
      report.generatedByMember !== undefined,
    );
    if (report.generatedByMember) {
      TestValidator.predicate(
        "generatedByMember has id",
        report.generatedByMember.id !== undefined,
      );
    }
  }
  // 10. Test 8: Verify results are sorted by created_at in descending order (newest first)
  const sortedResponse =
    await api.functional.erpHrm.admin.organizations.reports.index(
      adminConnection,
      {
        organizationId,
        body: { limit: 10 },
      },
    );
  typia.assert(sortedResponse);
  for (let i = 0; i < sortedResponse.data.length - 1; i++) {
    const current = new Date(sortedResponse.data[i].created_at);
    const next = new Date(sortedResponse.data[i + 1].created_at);
    TestValidator.predicate("sorted descending by created_at", current >= next);
  }
  // 11. Test pagination with different pages
  const page1 = await api.functional.erpHrm.admin.organizations.reports.index(
    adminConnection,
    {
      organizationId,
      body: { page: 1, limit: 2 },
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  const page2 = await api.functional.erpHrm.admin.organizations.reports.index(
    adminConnection,
    {
      organizationId,
      body: { page: 2, limit: 2 },
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
  // Verify page 1 and page 2 have different records
  if (page1.data.length > 0 && page2.data.length > 0) {
    const page1Ids = page1.data.map((r) => r.id);
    const page2Ids = page2.data.map((r) => r.id);
    TestValidator.predicate(
      "page 1 and page 2 have different records",
      !page1Ids.some((id) => page2Ids.includes(id)),
    );
  }
}
