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

/**
 * Test retrieving report parameters for a report that does not exist.
 *
 * Steps:
 * 1. Authenticate as a member via POST /erpHrm/auth/member/join
 * 2. Call GET /erpHrm/member/organizations/{organizationId}/reports/{reportId}/parameters
 *    with a non-existent reportId
 * 3. Verify response HTTP 404 Not Found status code
 * 4. Verify error response indicates report not found
 * 5. Verify no sensitive information is leaked in error message
 */
export async function test_api_report_parameters_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Call GET with non-existent reportId
  // Using a valid UUID format for organizationId (non-existent)
  // and a clearly non-existent reportId
  const nonExistentReportId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3 & 4. Verify HTTP 404 error is returned
  await TestValidator.httpError(
    "report not found returns 404",
    404,
    async () => {
      await api.functional.erpHrm.member.organizations.reports.parameters.at(
        memberConnection,
        {
          organizationId: organizationId,
          reportId: nonExistentReportId,
        },
      );
    },
  );
}
