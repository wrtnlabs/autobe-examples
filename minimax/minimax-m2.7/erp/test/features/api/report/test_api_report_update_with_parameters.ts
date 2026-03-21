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

export async function test_api_report_update_with_parameters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Get organization ID for report creation
  // Using a placeholder UUID that the test environment will resolve
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create a report with initial parameters
  const initialReport =
    await generate_random_erp_hrm_member_organizations_reports_create(
      memberConnection,
      {
        params: {
          organizationId: organizationId,
        },
        body: {
          report_type: "time_report",
          name: "Initial Time Report",
          parameter: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-01-15T23:59:59Z",
            group_by: "employee",
            billable: null,
          },
        },
      },
    );
  typia.assert(initialReport);
  // 3. Update the report with new name and modified parameters
  const updatedReport =
    await api.functional.erpHrm.member.organizations.reports.update(
      memberConnection,
      {
        organizationId: initialReport.organization.id,
        reportId: initialReport.id,
        body: {
          name: "Updated Time Report",
          parameter: {
            start_date: "2024-01-01T00:00:00Z",
            end_date: "2024-01-31T23:59:59Z",
            group_by: "project",
            billable: true,
          },
        } satisfies IErpHrmReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 4. Validate the update
  TestValidator.equals(
    "name updated",
    updatedReport.name,
    "Updated Time Report",
  );
  TestValidator.equals(
    "report_type unchanged",
    updatedReport.report_type,
    "time_report",
  );
  TestValidator.equals(
    "start_date updated",
    updatedReport.parameter.start_date,
    "2024-01-01T00:00:00Z",
  );
  TestValidator.equals(
    "end_date updated",
    updatedReport.parameter.end_date,
    "2024-01-31T23:59:59Z",
  );
  TestValidator.equals(
    "group_by updated to project",
    updatedReport.parameter.group_by,
    "project",
  );
  TestValidator.equals(
    "billable set to true",
    updatedReport.parameter.billable,
    true,
  );
  TestValidator.notEquals(
    "updated_at changed",
    initialReport.updated_at,
    updatedReport.updated_at,
  );
}
