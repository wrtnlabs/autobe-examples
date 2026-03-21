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

export async function test_api_report_time_report_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates via admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedAdmin);
  // 2. Generate a random organization ID for the report
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a time report with full filter parameters
  // - Date range spanning a full month (30 days)
  const startDate = RandomGenerator.date(new Date(), 0);
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const report = await api.functional.erpHrm.admin.organizations.reports.create(
    adminConnection,
    {
      organizationId,
      body: {
        report_type: "time_report",
        name: RandomGenerator.paragraph({ sentences: 1 }),
        parameter: {
          billable: null,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          group_by: "employee",
        } satisfies IErpHrmReportParameter.ICreate,
      } satisfies IErpHrmReport.ICreate,
    },
  );
  typia.assert(report);
  // 4. Validate response structure and parameters
  TestValidator.equals(
    "report_type is time_report",
    report.report_type,
    "time_report",
  );
  TestValidator.equals(
    "group_by is employee",
    report.parameter.group_by,
    "employee",
  );
  TestValidator.equals(
    "billable is null (include all)",
    report.parameter.billable,
    null,
  );
  // 5. Validate generatedByMember is set to the authenticated admin
  TestValidator.equals(
    "generatedByMember matches authenticated admin",
    report.generatedByMember.id,
    authorizedAdmin.id,
  );
  // 6. Validate report is scoped to the organization
  TestValidator.equals(
    "organization matches requested organizationId",
    report.organization.id,
    organizationId,
  );
}
