import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_report_filtering_by_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Set organization context
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection,
    {},
  );
  // 3. Test filtering by time_report
  const timeReportResponse = await api.functional.erpHrm.member.reports.index(
    memberConnection,
    {
      body: {
        reportType: "time_report",
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(timeReportResponse);
  // Validate all returned reports are time_report type
  for (const report of timeReportResponse.data) {
    TestValidator.equals(
      "report type is time_report",
      report.reportType,
      "time_report",
    );
  }
  // 4. Test filtering by project_budget_report
  const budgetReportResponse = await api.functional.erpHrm.member.reports.index(
    memberConnection,
    {
      body: {
        reportType: "project_budget_report",
      } satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(budgetReportResponse);
  // Validate all returned reports are project_budget_report type
  for (const report of budgetReportResponse.data) {
    TestValidator.equals(
      "report type is project_budget_report",
      report.reportType,
      "project_budget_report",
    );
  }
  // 5. Test without filter to ensure pagination works
  const allReportsResponse = await api.functional.erpHrm.member.reports.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmReport.IRequest,
    },
  );
  typia.assert(allReportsResponse);
  TestValidator.predicate(
    "has pagination info",
    allReportsResponse.pagination !== null,
  );
  TestValidator.predicate(
    "pagination has records count",
    allReportsResponse.pagination.records >= 0,
  );
}
