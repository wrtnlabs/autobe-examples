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

export async function test_api_report_update_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Create a report with specific parameters
  // Assuming the admin is associated with an organization
  // Using the organization ID from admin context or creating with orgId
  const organizationId = authorized.id satisfies string &
    typia.tags.Format<"uuid">;
  const report =
    await generate_random_erp_hrm_admin_organizations_reports_create(
      adminConnection,
      {
        params: { organizationId },
        body: {
          report_type: "weekly_summary_report",
          name: "Original Report Name",
          parameter: {
            start_date: typia.random<string & typia.tags.Format<"date-time">>(),
            end_date: typia.random<string & typia.tags.Format<"date-time">>(),
            group_by: "task",
          } satisfies IErpHrmReportParameter.ICreate,
        },
      },
    );
  typia.assert(report);
  // Store original parameter values for later comparison
  const originalStartDate = report.parameter.start_date;
  const originalEndDate = report.parameter.end_date;
  const originalGroupBy = report.parameter.group_by;
  const originalUpdatedAt = report.parameter.updated_at;
  // 3. Update only the name field, omitting parameter object entirely
  const updatedReport =
    await api.functional.erpHrm.admin.organizations.reports.update(
      adminConnection,
      {
        organizationId: report.organization.id,
        reportId: report.id,
        body: {
          name: "Updated Report Name",
        } satisfies IErpHrmReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 4. Validate the update
  // Verify name is updated
  TestValidator.equals(
    "name updated correctly",
    updatedReport.name,
    "Updated Report Name",
  );
  // Verify report_type is unchanged
  TestValidator.equals(
    "report_type unchanged",
    updatedReport.report_type,
    "weekly_summary_report",
  );
  // Verify original parameter values remain unchanged
  TestValidator.equals(
    "start_date unchanged",
    updatedReport.parameter.start_date,
    originalStartDate,
  );
  TestValidator.equals(
    "end_date unchanged",
    updatedReport.parameter.end_date,
    originalEndDate,
  );
  TestValidator.equals(
    "group_by unchanged",
    updatedReport.parameter.group_by,
    originalGroupBy,
  );
  // Verify updated_at timestamp is refreshed (should be different from original)
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    updatedReport.updated_at !== report.updated_at,
  );
  // Verify report ID remains the same
  TestValidator.equals("report ID unchanged", updatedReport.id, report.id);
}
