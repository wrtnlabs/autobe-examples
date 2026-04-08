import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_reports_create } from "../../../generate/generate_random_erp_hrm_admin_reports_create";
import { generate_random_erp_hrm_admin_reports_parameters_create } from "../../../generate/generate_random_erp_hrm_admin_reports_parameters_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";
import { prepare_random_erp_hrm_report_parameter } from "../../../prepare/prepare_random_erp_hrm_report_parameter";

export async function test_api_report_parameter_retrieval_with_valid_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Create organization with admin
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  // 4. Set organization context for member
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection,
    {
      body: {
        organizationId: organization.id,
      },
    },
  );
  // 5. Create a report with time_report type
  const startDate = new Date();
  startDate.setDate(1);
  const endDate = new Date();
  endDate.setDate(28);
  const report = await generate_random_erp_hrm_admin_reports_create(
    adminConnection,
    {
      body: {
        reportType: "time_report" as const,
        name: "Monthly Hours Report",
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        groupBy: "employee" as const,
      },
    },
  );
  // 6. Create report parameters with date range
  const reportStartDate = new Date();
  reportStartDate.setDate(1);
  reportStartDate.setHours(0, 0, 0, 0);
  const reportEndDate = new Date();
  reportEndDate.setDate(28);
  reportEndDate.setHours(23, 59, 59, 999);
  const parameter =
    await generate_random_erp_hrm_admin_reports_parameters_create(
      adminConnection,
      {
        params: {
          reportId: report.id,
        },
        body: {
          startDate: reportStartDate.toISOString(),
          endDate: reportEndDate.toISOString(),
          groupBy: "employee" as const,
        },
      },
    );
  // 7. Retrieve the report parameter as member
  const retrievedParameter =
    await api.functional.erpHrm.member.reports.parameters.at(memberConnection, {
      reportId: report.id,
      parameterId: parameter.id,
    });
  // Validate response with typia.assert
  typia.assert(retrievedParameter);
  // Validate parameter matches created parameter
  TestValidator.equals(
    "parameter id matches",
    retrievedParameter.id,
    parameter.id,
  );
  TestValidator.equals(
    "groupBy is employee",
    retrievedParameter.groupBy,
    "employee",
  );
  // Validate nested report object contains correct data
  TestValidator.equals(
    "report id matches",
    retrievedParameter.report.id,
    report.id,
  );
  TestValidator.equals(
    "report type is time_report",
    retrievedParameter.report.reportType,
    "time_report",
  );
  TestValidator.equals(
    "report name matches",
    retrievedParameter.report.name,
    "Monthly Hours Report",
  );
  // Validate organization isolation - report belongs to same organization
  TestValidator.equals(
    "organization id matches",
    retrievedParameter.report.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    retrievedParameter.report.organization.name,
    organization.name,
  );
  // Validate generated by member matches admin who created the report
  TestValidator.equals(
    "generatedByMember id matches",
    retrievedParameter.report.generatedByMember.id,
    report.generatedByMember.id,
  );
}
