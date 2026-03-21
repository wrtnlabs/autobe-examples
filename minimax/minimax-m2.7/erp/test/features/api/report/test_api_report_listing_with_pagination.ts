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
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_reports_create } from "../../../generate/generate_random_erp_hrm_member_organizations_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

export async function test_api_report_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Authenticate as admin to get organization context
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 3. Create several reports to populate the list
  // Note: Using the member connection as they need report:view permission
  const reportCount = 5;
  const createdReports = await ArrayUtil.asyncRepeat(reportCount, async () => {
    const report =
      await generate_random_erp_hrm_member_organizations_reports_create(
        memberConnection,
        {
          params: {
            organizationId: memberAuth.token.access, // Using token access as placeholder
          },
        },
      );
    typia.assert(report);
    return report;
  });
  // 4. Call PATCH /erpHrm/member/organizations/{organizationId}/reports with empty request body
  // to retrieve all reports with default pagination
  const organizationId = createdReports[0].organization.id;
  const page1Response =
    await api.functional.erpHrm.member.organizations.reports.index(
      memberConnection,
      {
        organizationId: organizationId,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IErpHrmReport.IRequest,
      },
    );
  typia.assert(page1Response);
  // 5. Validate response contains paginated results with IPage.IPagination metadata
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 records >= 0",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages >= 0",
    page1Response.pagination.pages >= 0,
  );
  // 6. Verify returned reports include IErpHrmReport.ISummary fields
  for (const report of page1Response.data) {
    TestValidator.predicate("report has id", report.id !== undefined);
    TestValidator.predicate(
      "report has report_type",
      report.report_type !== undefined,
    );
    TestValidator.predicate("report has name", report.name !== undefined);
    TestValidator.predicate(
      "report has created_at",
      report.created_at !== undefined,
    );
    TestValidator.predicate(
      "report has generatedByMember",
      report.generatedByMember !== undefined,
    );
    typia.assert(report);
  }
  // 7. Verify reports are sorted by created_at in descending order (newest first)
  if (page1Response.data.length > 1) {
    for (let i = 0; i < page1Response.data.length - 1; i++) {
      const current = new Date(page1Response.data[i].created_at).getTime();
      const next = new Date(page1Response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "reports sorted by created_at descending",
        current >= next,
      );
    }
  }
  // 8. Validate pagination works correctly - request page 2
  if (page1Response.pagination.pages > 1) {
    const page2Response =
      await api.functional.erpHrm.member.organizations.reports.index(
        memberConnection,
        {
          organizationId: organizationId,
          body: {
            page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 2 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IErpHrmReport.IRequest,
        },
      );
    typia.assert(page2Response);
    // Validate page 2 pagination metadata
    TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2Response.pagination.limit, 2);
    TestValidator.equals(
      "same total records",
      page2Response.pagination.records,
      page1Response.pagination.records,
    );
    TestValidator.equals(
      "same total pages",
      page2Response.pagination.pages,
      page1Response.pagination.pages,
    );
    // Verify page 2 has different data from page 1
    const page1Ids = page1Response.data.map((r) => r.id);
    const page2Ids = page2Response.data.map((r) => r.id);
    const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
    TestValidator.predicate(
      "page 2 has different reports than page 1",
      !hasOverlap,
    );
  }
}
