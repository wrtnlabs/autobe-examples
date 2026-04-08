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

export async function test_api_employee_dashboard_summary_missing_record(
  connection: api.IConnection,
): Promise<void> {
  const joined = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssw0rd123!",
        displayName: RandomGenerator.name(),
        href: "https://example.com/erp-hrm-time/join",
        referrer: "https://example.com/erp-hrm-time/referrer",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: joined.token.access,
  };
  await TestValidator.httpError(
    "missing employee dashboard summary should return not found",
    404,
    async () => {
      await api.functional.erpHrmTime.member.employees.dashboardSummaries.at(
        memberConnection,
        {
          employeeId: joined.id,
          employeeDashboardSummaryId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );
}
