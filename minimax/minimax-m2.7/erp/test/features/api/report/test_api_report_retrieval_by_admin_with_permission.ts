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

export async function test_api_report_retrieval_by_admin_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin via POST /erpHrm/auth/admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {});
  // 2. Create a new report within the organization
  const report =
    await generate_random_erp_hrm_admin_organizations_reports_create(
      adminConnection,
      {
        body: {
          report_type: "time_report",
          parameter: {
            group_by: "employee",
            start_date: new Date().toISOString(),
            end_date: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        },
        params: {
          organizationId: authorizedAdmin.id, // Using admin id as organizationId for the test
        },
      },
    );
  typia.assert(report);
  // 3. Retrieve the created report via GET /erpHrm/admin/organizations/{organizationId}/reports/{reportId}
  const retrievedReport =
    await api.functional.erpHrm.admin.organizations.reports.at(
      adminConnection,
      {
        organizationId: authorizedAdmin.id,
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);
  // 4. Validate response contains expected data
  TestValidator.equals("report_id matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report_type matches",
    retrievedReport.report_type,
    "time_report",
  );
  TestValidator.equals(
    "organization matches",
    retrievedReport.organization.id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "generatedByMember matches",
    retrievedReport.generatedByMember.email,
    authorizedAdmin.email,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedReport.created_at !== undefined,
  );
  TestValidator.predicate(
    "parameter exists",
    retrievedReport.parameter !== undefined,
  );
  TestValidator.equals(
    "parameter group_by matches",
    retrievedReport.parameter.group_by,
    "employee",
  );
}