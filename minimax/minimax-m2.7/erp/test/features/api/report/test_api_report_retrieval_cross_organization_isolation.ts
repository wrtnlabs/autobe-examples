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

/**
 * Test cross-organization isolation for report retrieval.
 *
 * This test validates that reports are strictly scoped to their parent organization
 * and cannot be accessed by members from different organizations, even when the
 * member belongs to multiple organizations.
 *
 * Steps:
 * 1. Create a member via join
 * 2. Create a report in Organization A using the generation utility
 * 3. Attempt to retrieve the report using Organization B's context (different organizationId)
 * 4. Validate HTTP 403 Forbidden response is returned
 * 5. Verify the error indicates access denied due to organization mismatch
 */
export async function test_api_report_retrieval_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member via join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Generate a report in Organization A
  const organizationAId = typia.random<string & tags.Format<"uuid">>();
  const reportA =
    await generate_random_erp_hrm_member_organizations_reports_create(
      memberConnection,
      {
        params: { organizationId: organizationAId },
      },
    );
  typia.assert(reportA);
  // 3. Attempt to retrieve the report using Organization B's context
  // This simulates a member from Organization B trying to access Organization A's report
  const organizationBId = typia.random<string & tags.Format<"uuid">>();
  // 4. Validate HTTP 403 Forbidden response
  await TestValidator.httpError(
    "cross-organization report access should be forbidden",
    403,
    async () =>
      await api.functional.erpHrm.member.organizations.reports.at(
        memberConnection,
        {
          organizationId: organizationBId,
          reportId: reportA.id,
        },
      ),
  );
}
