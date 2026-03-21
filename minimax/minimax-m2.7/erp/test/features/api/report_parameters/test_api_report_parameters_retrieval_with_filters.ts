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

export async function test_api_report_parameters_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin with report:view permission
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
  // 2. Create report with specific parameters (date range, group_by=employee, billable=true, employee filter)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date();
  const report =
    await generate_random_erp_hrm_admin_organizations_reports_create(
      adminConnection,
      {
        params: {
          organizationId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          report_type: "time_report",
          parameter: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            group_by: "employee",
            billable: true,
            employee_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      },
    );
  typia.assert(report);
  // 3. Retrieve report parameters using GET endpoint
  const parameters =
    await api.functional.erpHrm.admin.organizations.reports.parameters.at(
      adminConnection,
      {
        organizationId: report.organization.id,
        reportId: report.id,
      },
    );
  typia.assert(parameters);
  // 4. Validate the response matches exactly what was created
  TestValidator.equals(
    "start_date matches",
    parameters.start_date,
    report.parameter.start_date,
  );
  TestValidator.equals(
    "end_date matches",
    parameters.end_date,
    report.parameter.end_date,
  );
  TestValidator.equals(
    "group_by matches",
    parameters.group_by,
    report.parameter.group_by,
  );
  TestValidator.equals(
    "billable matches",
    parameters.billable,
    report.parameter.billable,
  );
  TestValidator.equals(
    "employee_id matches",
    parameters.employee?.id,
    report.parameter.employee?.id,
  );
}
