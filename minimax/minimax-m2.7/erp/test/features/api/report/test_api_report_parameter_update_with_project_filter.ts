import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_reports_create } from "../../../generate/generate_random_erp_hrm_member_organizations_reports_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

export async function test_api_report_parameter_update_with_project_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a project to use as filter
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#3F51B5" as string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active" as const,
      },
    },
  );
  typia.assert(project);
  // 3. Create a report without project filter - get organization ID from the authorized response
  const organizationId = authorized.activeTimers[0]?.project.organization.id;
  const report =
    await generate_random_erp_hrm_member_organizations_reports_create(
      memberConnection,
      {
        params: {
          organizationId:
            organizationId ?? typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          report_type: "time_report" as const,
          parameter: {
            start_date: new Date().toISOString(),
            end_date: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            group_by: "employee" as const,
            billable: null,
          },
        },
      },
    );
  typia.assert(report);
  const reportId = report.id;
  const originalStartDate = report.parameter.start_date;
  const originalEndDate = report.parameter.end_date;
  const originalGroupBy = report.parameter.group_by;
  const originalBillable = report.parameter.billable;
  // 4. Update report parameters with project_id filter
  const updatedParameter =
    await api.functional.erpHrm.member.organizations.reports.parameters.update(
      memberConnection,
      {
        organizationId: organizationId ?? report.organization.id,
        reportId: reportId,
        body: {
          project_id: project.id,
        } satisfies IErpHrmReportParameter.IUpdate,
      },
    );
  typia.assert(updatedParameter);
  // 5. Validate the response
  TestValidator.equals(
    "project_id matches created project",
    updatedParameter.project?.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    updatedParameter.project?.name,
    project.name,
  );
  TestValidator.equals(
    "project color matches",
    updatedParameter.project?.color,
    project.color,
  );
  TestValidator.equals(
    "project status matches",
    updatedParameter.project?.status,
    project.status,
  );
  TestValidator.equals(
    "start_date preserved",
    updatedParameter.start_date,
    originalStartDate,
  );
  TestValidator.equals(
    "end_date preserved",
    updatedParameter.end_date,
    originalEndDate,
  );
  TestValidator.equals(
    "group_by preserved",
    updatedParameter.group_by,
    originalGroupBy,
  );
  TestValidator.equals(
    "billable preserved as null",
    updatedParameter.billable,
    originalBillable,
  );
}
