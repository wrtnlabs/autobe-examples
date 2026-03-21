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

export async function test_api_report_update_parameters_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a report with report_type 'project_budget_report', group_by 'employee'
  const report =
    await generate_random_erp_hrm_admin_organizations_reports_create(
      adminConnection,
      {
        params: {
          organizationId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          report_type: "project_budget_report",
          name: RandomGenerator.name(),
          parameter: {
            start_date: new Date("2024-01-01T00:00:00Z").toISOString(),
            end_date: new Date("2024-01-31T23:59:59Z").toISOString(),
            group_by: "employee" as const,
          } satisfies IErpHrmReportParameter.ICreate,
        },
      },
    );
  typia.assert(report);
  // Store original values for validation
  const originalName: string | null | undefined = report.name;
  const originalStartDate: string = report.parameter.start_date;
  const originalEndDate: string = report.parameter.end_date;
  const originalGroupBy: "employee" | "project" | "task" =
    report.parameter.group_by;
  const originalUpdatedAt: string = report.updated_at;
  // 3. Update only parameters (omit name field)
  const updatedReport =
    await api.functional.erpHrm.admin.organizations.reports.update(
      adminConnection,
      {
        organizationId: report.organization.id,
        reportId: report.id,
        body: {
          parameter: {
            start_date: new Date("2024-06-01T00:00:00Z").toISOString(),
            end_date: new Date("2024-06-30T23:59:59Z").toISOString(),
            group_by: "project",
            billable: null,
          } satisfies IErpHrmReportParameter.IUpdate,
        },
      },
    );
  typia.assert(updatedReport);
  // 4. Validate original name remains unchanged
  TestValidator.equals(
    "name remains unchanged",
    updatedReport.name,
    originalName,
  );
  // 5. Validate updated parameter values
  TestValidator.equals(
    "start_date updated",
    updatedReport.parameter.start_date,
    new Date("2024-06-01T00:00:00Z").toISOString(),
  );
  TestValidator.equals(
    "end_date updated",
    updatedReport.parameter.end_date,
    new Date("2024-06-30T23:59:59Z").toISOString(),
  );
  TestValidator.equals(
    "group_by updated to project",
    updatedReport.parameter.group_by,
    "project",
  );
  TestValidator.equals(
    "billable set to null",
    updatedReport.parameter.billable,
    null,
  );
  // 6. Validate updated_at timestamp is refreshed (newer than original)
  const originalTimestamp: number = new Date(originalUpdatedAt).getTime();
  const updatedTimestamp: number = new Date(updatedReport.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is refreshed",
    updatedTimestamp > originalTimestamp,
  );
}
