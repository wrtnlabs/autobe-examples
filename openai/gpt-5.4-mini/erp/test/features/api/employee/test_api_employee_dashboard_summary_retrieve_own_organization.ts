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

export async function test_api_employee_dashboard_summary_retrieve_own_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: `${RandomGenerator.alphaNumeric(12)}!Aa` satisfies string,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
  } satisfies IErpHrmTimeEmployeeDashboardSummary.IRequest;
  const first =
    await api.functional.erpHrmTime.member.employees.dashboardSummaries.index(
      memberConnection,
      {
        employeeId,
        body: request,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.erpHrmTime.member.employees.dashboardSummaries.index(
      memberConnection,
      {
        employeeId,
        body: request,
      },
    );
  typia.assert(second);
  TestValidator.equals("pagination current page", first.pagination.current, 1);
  TestValidator.equals("pagination limit", first.pagination.limit, 10);
  TestValidator.predicate(
    "has at least one summary row",
    first.data.length >= 1,
  );
  TestValidator.equals(
    "stable pagination response",
    second.pagination,
    first.pagination,
  );
  TestValidator.equals("stable summary rows", second.data, first.data);
}
