import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployeeDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_dashboard_summary_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: `member-a-${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: `P@ssw0rd-${RandomGenerator.alphaNumeric(8)}`,
      displayName: RandomGenerator.name(),
      href: "http://localhost/erp/hrm/member-a",
      referrer: "http://localhost/erp/hrm",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberA);
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: `member-b-${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: `P@ssw0rd-${RandomGenerator.alphaNumeric(8)}`,
      displayName: RandomGenerator.name(),
      href: "http://localhost/erp/hrm/member-b",
      referrer: "http://localhost/erp/hrm",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberB);
  const foreignOrganizationEmployeeId = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IErpHrmTimeEmployeeDashboardSummary.IRequest;
  await TestValidator.httpError(
    "cross-organization dashboard summary access should be rejected",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.employees.dashboardSummaries.index(
        memberAConnection,
        {
          employeeId: foreignOrganizationEmployeeId,
          body: requestBody,
        },
      );
    },
  );
}
