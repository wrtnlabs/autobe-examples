import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_reports_create } from "../../../generate/generate_random_erp_hrm_admin_reports_create";
import { generate_random_erp_hrm_admin_reports_parameters_create } from "../../../generate/generate_random_erp_hrm_admin_reports_parameters_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

export async function test_api_report_parameter_retrieval_by_valid_ids(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a new report
  const report = await generate_random_erp_hrm_admin_reports_create(
    adminConnection,
    {
      body: {
        reportType: "time_report",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        groupBy: "employee",
        billable: true,
      },
    },
  );
  typia.assert(report);
  // 3. Create report parameters for the report
  const parameter =
    await generate_random_erp_hrm_admin_reports_parameters_create(
      adminConnection,
      {
        params: { reportId: report.id },
        body: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          groupBy: "employee",
          billable: true,
        },
      },
    );
  typia.assert(parameter);
  // 4. Retrieve the created parameter
  const retrievedParameter =
    await api.functional.erpHrm.admin.reports.parameters.at(adminConnection, {
      reportId: report.id,
      parameterId: parameter.id,
    });
  typia.assert(retrievedParameter);
  // Validations
  TestValidator.equals(
    "parameter id matches",
    retrievedParameter.id,
    parameter.id,
  );
  TestValidator.equals(
    "report id matches",
    retrievedParameter.report.id,
    report.id,
  );
  TestValidator.equals(
    "report type matches",
    retrievedParameter.report.reportType,
    typia.assert<"time_report" | "project_budget_report" | "weekly_summary_report">(report.reportType),
  );
  TestValidator.equals(
    "groupBy is employee",
    retrievedParameter.groupBy,
    "employee",
  );
  TestValidator.equals("billable is true", retrievedParameter.billable, true);
}