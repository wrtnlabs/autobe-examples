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

export async function test_api_dashboard_active_organization_snapshot(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const dashboardConnection: api.IConnection = { host: connection.host };
  dashboardConnection.headers = {
    Authorization: member.token.access,
  };
  const dashboard =
    await api.functional.hrmTimeTracking.member.dashboard.at(
      dashboardConnection,
    );
  typia.assert(dashboard);
  TestValidator.equals("dashboard member id", dashboard.member.id, member.id);
  TestValidator.equals(
    "dashboard member email",
    dashboard.member.email,
    member.email,
  );
  TestValidator.equals(
    "dashboard organization is active-context scoped",
    dashboard.organization.deletedAt,
    null,
  );
  TestValidator.equals(
    "dashboard personal section belongs to active member",
    dashboard.personal.currentTimesheet?.employee.id,
    dashboard.employee.id,
  );
  TestValidator.equals(
    "dashboard timer session belongs to active member when present",
    dashboard.timerSession?.employee.id,
    dashboard.employee.id,
  );
  TestValidator.predicate(
    "organization metrics are either available for report-view users or omitted for restricted users",
    dashboard.organizationMetrics === null ||
      typeof dashboard.organizationMetrics === "object",
  );
  TestValidator.predicate(
    "top projects list is present",
    Array.isArray(dashboard.topProjects),
  );
  TestValidator.predicate(
    "pending timesheets list is present",
    Array.isArray(dashboard.pendingTimesheets),
  );
  TestValidator.predicate(
    "recent timelogs list is present",
    Array.isArray(dashboard.recentTimelogs),
  );
}
