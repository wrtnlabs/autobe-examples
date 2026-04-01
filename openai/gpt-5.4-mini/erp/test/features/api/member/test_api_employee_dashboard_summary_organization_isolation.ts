import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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

export async function test_api_employee_dashboard_summary_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const secondConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/register/first",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(firstMember);
  const secondMember = await authorize_member_join(secondConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/register/second",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(secondMember);
  const firstSummary =
    await api.functional.erpHrmTime.member.employee_dashboard_summary.index(
      firstConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IErpHrmTimeEmployeeDashboardSummary.IRequest,
      },
    );
  typia.assert(firstSummary);
  const secondSummary =
    await api.functional.erpHrmTime.member.employee_dashboard_summary.index(
      secondConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IErpHrmTimeEmployeeDashboardSummary.IRequest,
      },
    );
  typia.assert(secondSummary);
  TestValidator.equals(
    "first dashboard request uses pagination page 1",
    firstSummary.pagination.current,
    1,
  );
  TestValidator.equals(
    "second dashboard request uses pagination page 1",
    secondSummary.pagination.current,
    1,
  );
  TestValidator.equals(
    "first dashboard request uses limit 1",
    firstSummary.pagination.limit,
    1,
  );
  TestValidator.equals(
    "second dashboard request uses limit 1",
    secondSummary.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "dashboard response contains at most one snapshot per requested page",
    firstSummary.data.length <= 1 && secondSummary.data.length <= 1,
  );
  TestValidator.notEquals(
    "dashboard snapshots should differ between independent member sessions",
    firstSummary.data[0]?.id ?? null,
    secondSummary.data[0]?.id ?? null,
  );
}
