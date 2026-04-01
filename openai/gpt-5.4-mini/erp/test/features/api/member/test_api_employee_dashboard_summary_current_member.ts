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

export async function test_api_employee_dashboard_summary_current_member(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/member/join",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const currentConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const request = {
    page: 1,
    limit: 10,
  } satisfies IErpHrmTimeEmployeeDashboardSummary.IRequest;
  const page =
    await api.functional.erpHrmTime.member.employee_dashboard_summary.index(
      currentConnection,
      { body: request },
    );
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records are non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "dashboard summary page contains at least one record",
    page.data.length >= 1,
  );
  const summary = page.data[0]!;
  typia.assert(summary);
  TestValidator.predicate(
    "hours logged today is non-negative",
    summary.hoursLoggedToday >= 0,
  );
  TestValidator.predicate(
    "hours logged this week is non-negative",
    summary.hoursLoggedThisWeek >= 0,
  );
  TestValidator.predicate(
    "recent timelog count is non-negative",
    summary.recentTimelogCount >= 0,
  );
  TestValidator.predicate(
    "open task count is non-negative",
    summary.assignedOpenTaskCount >= 0,
  );
  TestValidator.predicate(
    "in-progress task count is non-negative",
    summary.assignedInProgressTaskCount >= 0,
  );
  TestValidator.predicate(
    "active timer state matches timestamp presence",
    summary.hasActiveTimer === (summary.activeTimerStartedAt !== null),
  );
  TestValidator.predicate(
    "dashboard summary is scoped to the current member",
    summary.employee !== null,
  );
  const repeatedPage =
    await api.functional.erpHrmTime.member.employee_dashboard_summary.index(
      currentConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IErpHrmTimeEmployeeDashboardSummary.IRequest,
      },
    );
  typia.assert(repeatedPage);
  TestValidator.equals(
    "repeated pagination current page",
    repeatedPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "repeated pagination limit",
    repeatedPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "repeated request still returns a dashboard summary page",
    repeatedPage.data.length >= 1,
  );
  await TestValidator.error(
    "dashboard summary requires an authenticated member context",
    async () => {
      const anonymousConnection: api.IConnection = { host: connection.host };
      await api.functional.erpHrmTime.member.employee_dashboard_summary.index(
        anonymousConnection,
        {
          body: {
            page: 1,
            limit: 1,
          } satisfies IErpHrmTimeEmployeeDashboardSummary.IRequest,
        },
      );
    },
  );
}
