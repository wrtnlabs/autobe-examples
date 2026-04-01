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

export async function test_api_employee_dashboard_summary_live_work_state(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/join",
      referrer: "https://example.com/erp/signup",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const response =
    await api.functional.erpHrmTime.member.employee_dashboard_summary.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IErpHrmTimeEmployeeDashboardSummary.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  if (response.data.length === 0) return;
  const summary = response.data[0];
  typia.assert(summary);
  TestValidator.predicate(
    "summary hours today non-negative",
    summary.hoursLoggedToday >= 0,
  );
  TestValidator.predicate(
    "summary hours this week non-negative",
    summary.hoursLoggedThisWeek >= 0,
  );
  TestValidator.predicate(
    "summary recent timelog count non-negative",
    summary.recentTimelogCount >= 0,
  );
  TestValidator.predicate(
    "summary open task count non-negative",
    summary.assignedOpenTaskCount >= 0,
  );
  TestValidator.predicate(
    "summary in-progress task count non-negative",
    summary.assignedInProgressTaskCount >= 0,
  );
  TestValidator.predicate(
    "summary snapshot timestamp present",
    summary.snapshotAt.length > 0,
  );
  TestValidator.predicate(
    "summary recent timelog snapshot timestamp present",
    summary.recentTimelogSnapshotAt.length > 0,
  );
  if (summary.hasActiveTimer) {
    TestValidator.predicate(
      "active timer started at exists when timer is active",
      summary.activeTimerStartedAt !== null,
    );
  } else {
    TestValidator.equals(
      "active timer started at is null when timer inactive",
      summary.activeTimerStartedAt,
      null,
    );
  }
}
