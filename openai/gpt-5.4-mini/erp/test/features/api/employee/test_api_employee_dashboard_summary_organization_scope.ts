import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_dashboard_summary_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.erpHrmTime.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        displayName: RandomGenerator.name(),
        href: "https://example.com/onboarding",
        referrer: "https://example.com/landing",
        avatarImageUrl: null,
        phoneNumber: null,
        ip: null,
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(authorized);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const employeeDashboardSummaryId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "cross-organization dashboard summary access should be rejected",
    [403, 404],
    async () => {
      await api.functional.erpHrmTime.member.employees.dashboardSummaries.at(
        memberConnection,
        {
          employeeId,
          employeeDashboardSummaryId,
        },
      );
    },
  );
}
