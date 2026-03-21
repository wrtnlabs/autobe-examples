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

export async function test_api_report_parameters_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member1 and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {});
  typia.assert(member1Auth);
  // Step 2: Create member2 and authenticate
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {});
  typia.assert(member2Auth);
  // Step 3: Create report for member1's organization - extract org ID from response
  const member1Report =
    await generate_random_erp_hrm_member_organizations_reports_create(
      member1Connection,
      {
        params: {
          organizationId:
            member1Auth.activeTimers[0]?.project?.organization?.id!,
        },
      },
    );
  typia.assert(member1Report);
  const member1OrgId = member1Report.organization.id;
  // Step 4: Create report for member2's organization - extract org ID from response
  const member2Report =
    await generate_random_erp_hrm_member_organizations_reports_create(
      member2Connection,
      {
        params: {
          organizationId:
            member2Auth.activeTimers[0]?.project?.organization?.id!,
        },
      },
    );
  typia.assert(member2Report);
  const member2OrgId = member2Report.organization.id;
  // Step 5: Verify member1 can access their own report parameters
  const member1Params =
    await api.functional.erpHrm.member.organizations.reports.parameters.at(
      member1Connection,
      {
        organizationId: member1OrgId,
        reportId: member1Report.id,
      },
    );
  typia.assert(member1Params);
  TestValidator.equals(
    "member1 owns report",
    member1Params.report.id,
    member1Report.id,
  );
  // Step 6: Verify member2 can access their own report parameters
  const member2Params =
    await api.functional.erpHrm.member.organizations.reports.parameters.at(
      member2Connection,
      {
        organizationId: member2OrgId,
        reportId: member2Report.id,
      },
    );
  typia.assert(member2Params);
  TestValidator.equals(
    "member2 owns report",
    member2Params.report.id,
    member2Report.id,
  );
  // Step 7: Verify cross-organization isolation - member1 cannot access member2's report parameters
  await TestValidator.httpError(
    "member1 cannot access member2's report parameters",
    404,
    async () => {
      await api.functional.erpHrm.member.organizations.reports.parameters.at(
        member1Connection,
        {
          organizationId: member2OrgId,
          reportId: member2Report.id,
        },
      );
    },
  );
  // Step 8: Verify cross-organization isolation - member2 cannot access member1's report parameters
  await TestValidator.httpError(
    "member2 cannot access member1's report parameters",
    404,
    async () => {
      await api.functional.erpHrm.member.organizations.reports.parameters.at(
        member2Connection,
        {
          organizationId: member1OrgId,
          reportId: member1Report.id,
        },
      );
    },
  );
}
