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
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";

export async function test_api_report_retrieval_by_admin_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Create a report first
  const startDate = new Date().toISOString().split("T")[0];
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const report = await generate_random_erp_hrm_admin_reports_create(
    adminConnection,
    {
      body: {
        reportType: "time_report",
        startDate: startDate,
        endDate: endDate,
        groupBy: "employee",
      } satisfies IErpHrmReport.ICreate,
    },
  );
  typia.assert(report);
  // 3. Retrieve the report by ID
  const retrievedReport = await api.functional.erpHrm.admin.reports.at(
    adminConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // 4. Validate report metadata matches
  TestValidator.equals("report id matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report type matches",
    retrievedReport.reportType,
    report.reportType,
  );
  TestValidator.equals(
    "report name matches",
    retrievedReport.name,
    report.name,
  );
  TestValidator.equals(
    "createdAt matches",
    retrievedReport.createdAt,
    report.createdAt,
  );
  TestValidator.equals(
    "updatedAt matches",
    retrievedReport.updatedAt,
    report.updatedAt,
  );
  // 5. Validate nested organization object
  TestValidator.equals(
    "organization id matches",
    retrievedReport.organization.id,
    report.organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    retrievedReport.organization.name,
    report.organization.name,
  );
  // 6. Validate nested generatedByMember object
  TestValidator.equals(
    "generatedByMember id matches",
    retrievedReport.generatedByMember.id,
    report.generatedByMember.id,
  );
  TestValidator.equals(
    "generatedByMember email matches",
    retrievedReport.generatedByMember.email,
    report.generatedByMember.email,
  );
  // 7. Validate nested parameter object
  TestValidator.equals(
    "parameter group_by matches",
    retrievedReport.parameter.group_by,
    "employee",
  );
  TestValidator.equals(
    "parameter report id matches",
    retrievedReport.parameter.report.id,
    report.id,
  );
}
