import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboard";
import type { IHrmTimeTrackingDashboardOrganizationMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardOrganizationMetric";
import type { IHrmTimeTrackingDashboardPendingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardPendingTimesheet";
import type { IHrmTimeTrackingDashboardPeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardPeriod";
import type { IHrmTimeTrackingDashboardPersonal } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardPersonal";
import type { IHrmTimeTrackingDashboardRecentTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardRecentTimelog";
import type { IHrmTimeTrackingDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardSummary";
import type { IHrmTimeTrackingDashboardTopProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardTopProject";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimerSession";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IHrmTimeTrackingWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_dashboard_selected_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const dashboardConnection: api.IConnection = { host: connection.host };
  dashboardConnection.headers = {
    Authorization: `Bearer ${member.token.access}`,
  };
  const firstDashboard =
    await api.functional.hrmTimeTracking.member.dashboard.at(
      dashboardConnection,
    );
  typia.assert(firstDashboard);
  const secondDashboard =
    await api.functional.hrmTimeTracking.member.dashboard.at(
      dashboardConnection,
    );
  typia.assert(secondDashboard);
  TestValidator.equals(
    "dashboard member identity should remain stable for the authenticated session",
    firstDashboard.member.id,
    secondDashboard.member.id,
  );
  TestValidator.equals(
    "dashboard organization should remain stable for the authenticated session",
    firstDashboard.organization.id,
    secondDashboard.organization.id,
  );
  TestValidator.equals(
    "dashboard employee should remain stable for the authenticated session",
    firstDashboard.employee.id,
    secondDashboard.employee.id,
  );
  TestValidator.equals(
    "dashboard summary should remain stable for the authenticated session",
    firstDashboard.summary,
    secondDashboard.summary,
  );
  TestValidator.equals(
    "dashboard personal snapshot should remain stable for the authenticated session",
    firstDashboard.personal,
    secondDashboard.personal,
  );
  TestValidator.equals(
    "dashboard top projects should remain stable for the authenticated session",
    firstDashboard.topProjects,
    secondDashboard.topProjects,
  );
  TestValidator.equals(
    "dashboard pending timesheets should remain stable for the authenticated session",
    firstDashboard.pendingTimesheets,
    secondDashboard.pendingTimesheets,
  );
  TestValidator.equals(
    "dashboard recent timelogs should remain stable for the authenticated session",
    firstDashboard.recentTimelogs,
    secondDashboard.recentTimelogs,
  );
  TestValidator.equals(
    "dashboard organization metrics should remain stable for the authenticated session",
    firstDashboard.organizationMetrics,
    secondDashboard.organizationMetrics,
  );
  TestValidator.equals(
    "dashboard current period should remain stable for the authenticated session",
    firstDashboard.period,
    secondDashboard.period,
  );
  TestValidator.equals(
    "dashboard timer session should remain stable for the authenticated session",
    firstDashboard.timerSession,
    secondDashboard.timerSession,
  );
}
