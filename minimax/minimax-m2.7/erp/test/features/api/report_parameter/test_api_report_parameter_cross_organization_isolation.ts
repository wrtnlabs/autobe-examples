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

export async function test_api_report_parameter_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member1 and organization1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {});
  const org1AdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(org1AdminConnection, {
    body: {
      email: member1Auth.email,
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IErpHrmAdmin.ILogin,
  });
  const org1 = await generate_random_erp_hrm_admin_organizations_create(
    org1AdminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscalStartMonth: 1,
      },
    },
  );
  typia.assert(org1);
  // Step 2: Set context to organization1
  const member1OrgConnection: api.IConnection = { host: connection.host };
  await generate_random_erp_hrm_member_organization_context_select(
    member1OrgConnection,
    {
      body: {
        organizationId: org1.id,
      },
    },
  );
  // Step 2: Create a report with parameters in organization1
  const report = await generate_random_erp_hrm_admin_reports_create(
    member1OrgConnection,
    {
      body: {
        reportType: "time_report",
        name: RandomGenerator.name(),
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        groupBy: "employee",
      },
    },
  );
  typia.assert(report);
  const reportParameter =
    await generate_random_erp_hrm_admin_reports_parameters_create(
      member1OrgConnection,
      {
        params: {
          reportId: report.id,
        },
        body: {
          startDate: "2024-01-01T00:00:00.000Z",
          endDate: "2024-01-31T23:59:59.999Z",
          groupBy: "employee",
        },
      },
    );
  typia.assert(reportParameter);
  // Step 3: Create member2 and organization2
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {});
  const org2AdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(org2AdminConnection, {
    body: {
      email: member2Auth.email,
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IErpHrmAdmin.ILogin,
  });
  const org2 = await generate_random_erp_hrm_admin_organizations_create(
    org2AdminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        currency: "EUR",
        timezone: "Europe/London",
        fiscalStartMonth: 4,
      },
    },
  );
  typia.assert(org2);
  // Step 4: Set context to organization2
  const member2OrgConnection: api.IConnection = { host: connection.host };
  await generate_random_erp_hrm_member_organization_context_select(
    member2OrgConnection,
    {
      body: {
        organizationId: org2.id,
      },
    },
  );
  // Step 5: Attempt to retrieve report parameter from organization1 while in organization2 context
  // This should fail with 404 due to cross-organization data isolation
  await TestValidator.error(
    "cross-organization report parameter access denied",
    async () => {
      await api.functional.erpHrm.member.reports.parameters.at(
        member2OrgConnection,
        {
          reportId: report.id,
          parameterId: reportParameter.id,
        },
      );
    },
  );
}
