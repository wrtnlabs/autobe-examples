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
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

export async function test_api_report_update_group_by_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const organizationId = authorized.activeTimers[0]?.project.organization.id;
  if (!organizationId) {
    throw new Error("No organization found in active timers");
  }
  // 2. Create a report with initial group_by: 'employee'
  const initialReport =
    await generate_random_erp_hrm_member_organizations_reports_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          report_type: "time_report",
          name: "Initial Group By Employee Report",
          parameter: {
            start_date: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            end_date: new Date().toISOString(),
            group_by: "employee",
          },
        },
      },
    );
  typia.assert(initialReport);
  TestValidator.equals(
    "initial group_by is employee",
    initialReport.parameter.group_by,
    "employee",
  );
  // 3. Update the report changing group_by to 'project'
  const updatedReport1 =
    await api.functional.erpHrm.member.organizations.reports.update(
      memberConnection,
      {
        organizationId,
        reportId: initialReport.id,
        body: {
          parameter: {
            group_by: "project",
          },
        },
      },
    );
  typia.assert(updatedReport1);
  TestValidator.equals(
    "updated group_by is project",
    updatedReport1.parameter.group_by,
    "project",
  );
  // 4. Update again changing group_by to 'task'
  const updatedReport2 =
    await api.functional.erpHrm.member.organizations.reports.update(
      memberConnection,
      {
        organizationId,
        reportId: initialReport.id,
        body: {
          parameter: {
            group_by: "task",
          },
        },
      },
    );
  typia.assert(updatedReport2);
  TestValidator.equals(
    "final group_by is task",
    updatedReport2.parameter.group_by,
    "task",
  );
}
