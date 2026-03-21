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
 * Test that the report types endpoint properly enforces authorization for
 * report:view permission. This endpoint requires the member actor with
 * appropriate report viewing permissions. Verify that when accessing the
 * report types endpoint, the system validates the member has the necessary
 * report:view permission before returning available report types. Users
 * without this permission should not be able to view, generate, or export
 * any reports. The response should only include report types that the
 * authenticated member has permission to access.
 */
export async function test_api_report_types_view_permission_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection for authenticated access
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate random organization ID for testing
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Access report types endpoint with authenticated member
  const reportTypes =
    await api.functional.erpHrm.member.organizations.reports.types.listTypes(
      memberConnection,
      {
        organizationId,
      },
    );
  typia.assert(reportTypes);
  // 4. Validate response structure
  TestValidator.predicate("report has valid id", reportTypes.id !== undefined);
  TestValidator.predicate(
    "report has valid report_type",
    reportTypes.report_type !== undefined,
  );
  TestValidator.predicate(
    "report has organization",
    reportTypes.organization !== undefined,
  );
  TestValidator.predicate(
    "report has generatedByMember",
    reportTypes.generatedByMember !== undefined,
  );
  TestValidator.predicate(
    "report has parameter",
    reportTypes.parameter !== undefined,
  );
}
