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

export async function test_api_report_update_name_and_parameters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin via POST /erpHrm/auth/admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create a report using generation function
  const createdReport =
    await generate_random_erp_hrm_admin_organizations_reports_create(
      adminConnection,
      {
        params: {
          organizationId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          report_type: "time_report",
          name: RandomGenerator.name(),
          parameter: {
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 86400000).toISOString(),
            group_by: "employee",
          } satisfies IErpHrmReportParameter.ICreate,
        },
      },
    );
  typia.assert(createdReport);
  // Extract organization ID from the created report
  const organizationId = createdReport.organization.id;
  const originalReportId = createdReport.id;
  const originalName = createdReport.name;
  const originalUpdatedAt = createdReport.updated_at;
  const originalGroupBy = createdReport.parameter.group_by;
  const originalBillable = createdReport.parameter.billable;
  // Store original dates to compare later
  const originalStartDate = createdReport.parameter.start_date;
  const originalEndDate = createdReport.parameter.end_date;
  // 3. Update the report via PUT with new name and modified parameters
  const newName = RandomGenerator.paragraph({ sentences: 2 });
  const newStartDate = new Date(Date.now() - 86400000 * 7);
  const newEndDate = new Date();
  const updatedReport =
    await api.functional.erpHrm.admin.organizations.reports.update(
      adminConnection,
      {
        organizationId: organizationId,
        reportId: originalReportId,
        body: {
          name: newName,
          parameter: {
            start_date: newStartDate.toISOString(),
            end_date: newEndDate.toISOString(),
            group_by: "project",
            billable: true,
          } satisfies IErpHrmReportParameter.IUpdate,
        } satisfies IErpHrmReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 4. Validate the response
  TestValidator.equals(
    "report ID unchanged",
    updatedReport.id,
    originalReportId,
  );
  TestValidator.equals(
    "organization unchanged",
    updatedReport.organization.id,
    organizationId,
  );
  TestValidator.equals("name updated", updatedReport.name, newName);
  TestValidator.predicate(
    "updated_at refreshed",
    new Date(updatedReport.updated_at) > new Date(originalUpdatedAt),
  );
  TestValidator.equals(
    "group_by changed to project",
    updatedReport.parameter.group_by,
    "project",
  );
  TestValidator.equals(
    "billable set to true",
    updatedReport.parameter.billable,
    true,
  );
  TestValidator.equals(
    "date range updated",
    updatedReport.parameter.start_date,
    newStartDate.toISOString(),
  );
  TestValidator.equals(
    "date range end updated",
    updatedReport.parameter.end_date,
    newEndDate.toISOString(),
  );
}
